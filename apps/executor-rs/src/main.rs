use serde::{Deserialize, Serialize};
use std::env;
use std::fs;
use std::io::{Read, Write};
use std::path::{Path, PathBuf};
use std::process::{Command, ExitStatus, Stdio};
use std::thread;
use std::time::{Duration, Instant};
use uuid::Uuid;

const MISSING_TOOL_SENTINEL: &str = "__statecode_missing_tool__";

#[derive(Debug, Deserialize)]
struct SandboxRequest {
    submission_id: Option<String>,
    language: String,
    source: String,
    stdin: Option<String>,
    expected_stdout: Option<String>,
    time_limit_ms: Option<u64>,
    memory_limit_mb: Option<u64>,
    output_limit_bytes: Option<usize>,
}

#[derive(Debug, Serialize)]
struct SandboxResponse {
    submission_id: Option<String>,
    verdict: Verdict,
    language: String,
    exit_code: Option<i32>,
    compile_stdout: String,
    compile_stderr: String,
    stdout: String,
    stderr: String,
    duration_ms: u128,
    time_limit_ms: u64,
    memory_limit_mb: u64,
    output_truncated: bool,
    work_dir: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "kebab-case")]
enum Verdict {
    Accepted,
    CompileError,
    RuntimeError,
    TimeLimitExceeded,
    OutputLimitExceeded,
    WrongAnswer,
    ToolUnavailable,
    InternalError,
}

#[derive(Debug, Clone)]
struct LanguageAdapter {
    source_file: &'static str,
    extra_files: Vec<(&'static str, &'static str)>,
    compile: Vec<Vec<String>>,
    run: Vec<String>,
}

#[derive(Debug)]
struct ProcessResult {
    status: Option<ExitStatus>,
    stdout: String,
    stderr: String,
    timed_out: bool,
    output_truncated: bool,
}

fn main() {
    let started = Instant::now();
    let request = match read_request() {
        Ok(request) => request,
        Err(error) => {
            print_response(SandboxResponse {
                submission_id: None,
                verdict: Verdict::InternalError,
                language: "unknown".to_string(),
                exit_code: None,
                compile_stdout: String::new(),
                compile_stderr: error,
                stdout: String::new(),
                stderr: String::new(),
                duration_ms: started.elapsed().as_millis(),
                time_limit_ms: 0,
                memory_limit_mb: 0,
                output_truncated: false,
                work_dir: String::new(),
            });
            std::process::exit(1);
        }
    };

    let response = execute_request(request, started);
    let failed = !matches!(response.verdict, Verdict::Accepted);
    print_response(response);
    if failed {
        std::process::exit(1);
    }
}

fn read_request() -> Result<SandboxRequest, String> {
    let mut args = env::args().skip(1);
    let raw = match args.next().as_deref() {
        Some("--request") => {
            let path = args
                .next()
                .ok_or_else(|| "--request requires a file path".to_string())?;
            fs::read_to_string(path)
                .map_err(|error| format!("failed to read request file: {error}"))?
        }
        Some(path) => fs::read_to_string(path)
            .map_err(|error| format!("failed to read request file: {error}"))?,
        None => {
            let mut raw = String::new();
            std::io::stdin()
                .read_to_string(&mut raw)
                .map_err(|error| format!("failed to read stdin: {error}"))?;
            raw
        }
    };

    serde_json::from_str(&raw).map_err(|error| format!("invalid request json: {error}"))
}

fn execute_request(request: SandboxRequest, started: Instant) -> SandboxResponse {
    let time_limit_ms = request.time_limit_ms.unwrap_or(2_000).clamp(100, 30_000);
    let memory_limit_mb = request.memory_limit_mb.unwrap_or(256).clamp(16, 4096);
    let output_limit_bytes = request
        .output_limit_bytes
        .unwrap_or(256 * 1024)
        .clamp(1024, 4 * 1024 * 1024);
    let work_dir = create_work_dir();
    let work_dir_display = work_dir.display().to_string();
    let language = request.language.clone();

    let Some(adapter) = language_adapter(&request.language) else {
        return SandboxResponse {
            submission_id: request.submission_id,
            verdict: Verdict::ToolUnavailable,
            language,
            exit_code: None,
            compile_stdout: String::new(),
            compile_stderr: "unsupported language".to_string(),
            stdout: String::new(),
            stderr: String::new(),
            duration_ms: started.elapsed().as_millis(),
            time_limit_ms,
            memory_limit_mb,
            output_truncated: false,
            work_dir: work_dir_display,
        };
    };

    if let Err(error) = fs::create_dir_all(&work_dir) {
        return internal_error(
            request,
            language,
            started,
            time_limit_ms,
            memory_limit_mb,
            work_dir_display,
            error.to_string(),
        );
    }

    let source_path = work_dir.join(adapter.source_file);
    if let Err(error) = fs::write(&source_path, &request.source) {
        cleanup_work_dir(&work_dir);
        return internal_error(
            request,
            language,
            started,
            time_limit_ms,
            memory_limit_mb,
            work_dir_display,
            error.to_string(),
        );
    }

    for (path, content) in &adapter.extra_files {
        if let Err(error) = fs::write(work_dir.join(path), content) {
            cleanup_work_dir(&work_dir);
            return internal_error(
                request,
                language,
                started,
                time_limit_ms,
                memory_limit_mb,
                work_dir_display,
                error.to_string(),
            );
        }
    }

    let mut compile_stdout = String::new();
    let mut compile_stderr = String::new();
    for compile_command in &adapter.compile {
        let result = run_process(
            compile_command,
            "",
            &work_dir,
            Duration::from_millis(time_limit_ms.saturating_mul(2)),
            output_limit_bytes,
        );

        match result {
            Ok(result) => {
                compile_stdout.push_str(&result.stdout);
                compile_stderr.push_str(&result.stderr);
                if result.timed_out {
                    cleanup_work_dir(&work_dir);
                    return response(
                        request.submission_id,
                        Verdict::TimeLimitExceeded,
                        language,
                        result.status.and_then(|status| status.code()),
                        compile_stdout,
                        compile_stderr,
                        String::new(),
                        String::new(),
                        started,
                        time_limit_ms,
                        memory_limit_mb,
                        result.output_truncated,
                        work_dir_display,
                    );
                }

                if !result
                    .status
                    .map(|status| status.success())
                    .unwrap_or(false)
                {
                    cleanup_work_dir(&work_dir);
                    return response(
                        request.submission_id,
                        Verdict::CompileError,
                        language,
                        result.status.and_then(|status| status.code()),
                        compile_stdout,
                        compile_stderr,
                        String::new(),
                        String::new(),
                        started,
                        time_limit_ms,
                        memory_limit_mb,
                        result.output_truncated,
                        work_dir_display,
                    );
                }
            }
            Err(error) => {
                cleanup_work_dir(&work_dir);
                return response(
                    request.submission_id,
                    Verdict::ToolUnavailable,
                    language,
                    None,
                    compile_stdout,
                    error,
                    String::new(),
                    String::new(),
                    started,
                    time_limit_ms,
                    memory_limit_mb,
                    false,
                    work_dir_display,
                );
            }
        }
    }

    let result = run_process(
        &adapter.run,
        request.stdin.as_deref().unwrap_or_default(),
        &work_dir,
        Duration::from_millis(time_limit_ms),
        output_limit_bytes,
    );
    cleanup_work_dir(&work_dir);

    match result {
        Ok(result) => {
            let verdict = if result.timed_out {
                Verdict::TimeLimitExceeded
            } else if result.output_truncated {
                Verdict::OutputLimitExceeded
            } else if result
                .status
                .map(|status| status.success())
                .unwrap_or(false)
            {
                match &request.expected_stdout {
                    Some(expected)
                        if normalize_output(&result.stdout) != normalize_output(expected) =>
                    {
                        Verdict::WrongAnswer
                    }
                    _ => Verdict::Accepted,
                }
            } else {
                Verdict::RuntimeError
            };

            response(
                request.submission_id,
                verdict,
                language,
                result.status.and_then(|status| status.code()),
                compile_stdout,
                compile_stderr,
                result.stdout,
                result.stderr,
                started,
                time_limit_ms,
                memory_limit_mb,
                result.output_truncated,
                work_dir_display,
            )
        }
        Err(error) => response(
            request.submission_id,
            Verdict::ToolUnavailable,
            language,
            None,
            compile_stdout,
            compile_stderr,
            String::new(),
            error,
            started,
            time_limit_ms,
            memory_limit_mb,
            false,
            work_dir_display,
        ),
    }
}

fn run_process(
    command: &[String],
    stdin_payload: &str,
    work_dir: &Path,
    timeout: Duration,
    output_limit_bytes: usize,
) -> Result<ProcessResult, String> {
    let (program, args) = command
        .split_first()
        .ok_or_else(|| "empty command".to_string())?;

    if program == MISSING_TOOL_SENTINEL {
        return Err(args.join(" "));
    }

    let program_path = resolve_program_path(program, work_dir);
    let mut child = Command::new(&program_path)
        .args(args)
        .current_dir(work_dir)
        .stdin(Stdio::piped())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .spawn()
        .map_err(|error| format!("{program} is unavailable or failed to start: {error}"))?;

    if let Some(mut stdin) = child.stdin.take() {
        let payload = stdin_payload.as_bytes().to_vec();
        thread::spawn(move || {
            let _ = stdin.write_all(&payload);
        });
    }

    let started = Instant::now();
    let mut timed_out = false;
    let status = loop {
        match child.try_wait() {
            Ok(Some(status)) => break Some(status),
            Ok(None) => {
                if started.elapsed() >= timeout {
                    timed_out = true;
                    let _ = child.kill();
                    break child.wait().ok();
                }
                thread::sleep(Duration::from_millis(5));
            }
            Err(_) => break None,
        }
    };

    let output = child
        .wait_with_output()
        .map_err(|error| format!("failed to read process output: {error}"))?;
    let (stdout, stdout_truncated) = capped_string(&output.stdout, output_limit_bytes);
    let remaining = output_limit_bytes.saturating_sub(stdout.len());
    let (stderr, stderr_truncated) = capped_string(&output.stderr, remaining.max(1024));

    Ok(ProcessResult {
        status,
        stdout,
        stderr,
        timed_out,
        output_truncated: stdout_truncated || stderr_truncated,
    })
}

fn language_adapter(language: &str) -> Option<LanguageAdapter> {
    macro_rules! command {
        ($($part:expr),* $(,)?) => {
            vec![$($part.to_string()),*]
        };
    }

    let exe = if cfg!(windows) { "main.exe" } else { "main" };
    let exe_path = if cfg!(windows) {
        ".\\main.exe"
    } else {
        "./main"
    };
    let c_compiler = find_tool(&["gcc", "clang", "cl"]);
    let cpp_compiler = find_tool(&["g++", "clang++", "cl"]);

    match language {
        "C" => Some(LanguageAdapter {
            source_file: "main.c",
            extra_files: vec![],
            compile: vec![compile_c_command(c_compiler.as_deref(), exe)],
            run: command!(exe_path),
        }),
        "C++17" => Some(LanguageAdapter {
            source_file: "main.cpp",
            extra_files: vec![],
            compile: vec![compile_cpp_command(cpp_compiler.as_deref(), "c++17", exe)],
            run: command!(exe_path),
        }),
        "C++20" => Some(LanguageAdapter {
            source_file: "main.cpp",
            extra_files: vec![],
            compile: vec![compile_cpp_command(cpp_compiler.as_deref(), "c++20", exe)],
            run: command!(exe_path),
        }),
        "Rust" => Some(LanguageAdapter {
            source_file: "main.rs",
            extra_files: vec![],
            compile: vec![command!("rustc", "main.rs", "-O", "-o", exe)],
            run: command!(exe_path),
        }),
        "Go" => Some(LanguageAdapter {
            source_file: "main.go",
            extra_files: vec![],
            compile: vec![command!("go", "build", "-o", exe, "main.go")],
            run: command!(exe_path),
        }),
        "Java 21" => Some(LanguageAdapter {
            source_file: "Main.java",
            extra_files: vec![],
            compile: vec![command!("javac", "Main.java")],
            run: command!("java", "-cp", ".", "Main"),
        }),
        "Kotlin" => Some(LanguageAdapter {
            source_file: "Main.kt",
            extra_files: vec![],
            compile: vec![command!(
                "kotlinc",
                "Main.kt",
                "-include-runtime",
                "-d",
                "main.jar",
            )],
            run: command!("java", "-jar", "main.jar"),
        }),
        "Python 3.12" => Some(LanguageAdapter {
            source_file: "main.py",
            extra_files: vec![],
            compile: vec![],
            run: command!(python_command(), "main.py"),
        }),
        "JavaScript" => Some(LanguageAdapter {
            source_file: "main.js",
            extra_files: vec![],
            compile: vec![],
            run: command!("node", "main.js"),
        }),
        "TypeScript" => Some(LanguageAdapter {
            source_file: "main.ts",
            extra_files: vec![],
            compile: vec![command!(
                "npx", "--yes", "tsc", "main.ts", "--target", "ES2022", "--module", "commonjs",
                "--outDir", "dist",
            )],
            run: command!("node", "dist/main.js"),
        }),
        "C#" => Some(LanguageAdapter {
            source_file: "Program.cs",
            extra_files: vec![(
                "StateCodeSandbox.csproj",
                r#"<Project Sdk="Microsoft.NET.Sdk">
  <PropertyGroup>
    <OutputType>Exe</OutputType>
    <TargetFramework>net8.0</TargetFramework>
    <ImplicitUsings>enable</ImplicitUsings>
    <Nullable>enable</Nullable>
  </PropertyGroup>
</Project>
"#,
            )],
            compile: vec![command!(
                "dotnet",
                "build",
                "StateCodeSandbox.csproj",
                "-c",
                "Release",
                "-o",
                "out",
            )],
            run: command!("dotnet", "out/StateCodeSandbox.dll"),
        }),
        _ => None,
    }
}

fn python_command() -> &'static str {
    if cfg!(windows) {
        "python"
    } else {
        "python3"
    }
}

fn resolve_program_path(program: &str, work_dir: &Path) -> PathBuf {
    if program.starts_with(".\\") || program.starts_with("./") {
        return work_dir.join(program.trim_start_matches(".\\").trim_start_matches("./"));
    }

    PathBuf::from(program)
}

fn compile_c_command(compiler: Option<&str>, exe: &str) -> Vec<String> {
    let Some(compiler) = compiler else {
        return vec![
            MISSING_TOOL_SENTINEL.to_string(),
            "C compiler not found. Install gcc via MSYS2, clang via LLVM, or cl via Visual Studio Build Tools, then restart the API.".to_string(),
        ];
    };

    if compiler.eq_ignore_ascii_case("cl") {
        return vec![
            "cl".to_string(),
            "/nologo".to_string(),
            "/O2".to_string(),
            "/Fe:main.exe".to_string(),
            "main.c".to_string(),
        ];
    }

    vec![
        compiler.to_string(),
        "main.c".to_string(),
        "-std=c17".to_string(),
        "-O2".to_string(),
        "-pipe".to_string(),
        "-o".to_string(),
        exe.to_string(),
    ]
}

fn compile_cpp_command(compiler: Option<&str>, standard: &str, exe: &str) -> Vec<String> {
    let Some(compiler) = compiler else {
        return vec![
            MISSING_TOOL_SENTINEL.to_string(),
            "C++ compiler not found. Install g++ via MSYS2, clang++ via LLVM, or cl via Visual Studio Build Tools, then restart the API.".to_string(),
        ];
    };

    if compiler.eq_ignore_ascii_case("cl") {
        return vec![
            "cl".to_string(),
            "/nologo".to_string(),
            "/EHsc".to_string(),
            "/O2".to_string(),
            "/std:c++20".to_string(),
            "/Fe:main.exe".to_string(),
            "main.cpp".to_string(),
        ];
    }

    vec![
        compiler.to_string(),
        "main.cpp".to_string(),
        format!("-std={standard}"),
        "-O2".to_string(),
        "-pipe".to_string(),
        "-o".to_string(),
        exe.to_string(),
    ]
}

fn find_tool(candidates: &[&str]) -> Option<String> {
    candidates
        .iter()
        .find(|candidate| command_available(candidate))
        .map(|candidate| (*candidate).to_string())
}

fn command_available(command: &str) -> bool {
    let Some(paths) = env::var_os("PATH") else {
        return false;
    };
    let extensions = executable_extensions();

    env::split_paths(&paths).any(|path| {
        if path.join(command).is_file() {
            return true;
        }

        extensions
            .iter()
            .any(|extension| path.join(format!("{command}{extension}")).is_file())
    })
}

fn executable_extensions() -> Vec<String> {
    if !cfg!(windows) {
        return vec![String::new()];
    }

    env::var("PATHEXT")
        .unwrap_or_else(|_| ".EXE;.BAT;.CMD".to_string())
        .split(';')
        .map(|extension| extension.to_ascii_lowercase())
        .chain([".exe".to_string(), ".bat".to_string(), ".cmd".to_string()])
        .collect()
}

fn create_work_dir() -> PathBuf {
    let root = env::var("EXECUTOR_WORK_DIR")
        .map(PathBuf::from)
        .unwrap_or_else(|_| env::temp_dir().join("statecode-executor"));
    root.join(Uuid::new_v4().simple().to_string())
}

fn cleanup_work_dir(path: &Path) {
    if env::var("EXECUTOR_KEEP_WORKDIR").ok().as_deref() == Some("1") {
        return;
    }
    let _ = fs::remove_dir_all(path);
}

fn capped_string(bytes: &[u8], limit: usize) -> (String, bool) {
    let truncated = bytes.len() > limit;
    let slice = if truncated { &bytes[..limit] } else { bytes };
    (String::from_utf8_lossy(slice).to_string(), truncated)
}

fn normalize_output(value: &str) -> String {
    value
        .replace("\r\n", "\n")
        .trim_end_matches(|character: char| character.is_whitespace())
        .to_string()
}

#[allow(clippy::too_many_arguments)]
fn response(
    submission_id: Option<String>,
    verdict: Verdict,
    language: String,
    exit_code: Option<i32>,
    compile_stdout: String,
    compile_stderr: String,
    stdout: String,
    stderr: String,
    started: Instant,
    time_limit_ms: u64,
    memory_limit_mb: u64,
    output_truncated: bool,
    work_dir: String,
) -> SandboxResponse {
    SandboxResponse {
        submission_id,
        verdict,
        language,
        exit_code,
        compile_stdout,
        compile_stderr,
        stdout,
        stderr,
        duration_ms: started.elapsed().as_millis(),
        time_limit_ms,
        memory_limit_mb,
        output_truncated,
        work_dir,
    }
}

fn internal_error(
    request: SandboxRequest,
    language: String,
    started: Instant,
    time_limit_ms: u64,
    memory_limit_mb: u64,
    work_dir: String,
    error: String,
) -> SandboxResponse {
    response(
        request.submission_id,
        Verdict::InternalError,
        language,
        None,
        String::new(),
        error,
        String::new(),
        String::new(),
        started,
        time_limit_ms,
        memory_limit_mb,
        false,
        work_dir,
    )
}

fn print_response(response: SandboxResponse) {
    let raw = serde_json::to_string_pretty(&response)
        .unwrap_or_else(|_| "{\"verdict\":\"internal-error\"}".to_string());
    println!("{raw}");
}

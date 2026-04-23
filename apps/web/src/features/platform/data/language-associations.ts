export type EditorLanguage = {
  name: string;
  extension: string;
  comment: string;
  entrypoint: string;
  keywords: string[];
  functions: string[];
  snippets: string[];
  template: string;
};

const commonIoHint = "Read from stdin, write to stdout, avoid prompts.";

export const editorLanguages: Record<string, EditorLanguage> = {
  C: {
    name: "C",
    extension: "main.c",
    comment: "//",
    entrypoint: "int main(void)",
    keywords: ["auto", "break", "case", "char", "const", "continue", "double", "else", "for", "if", "int", "long", "return", "sizeof", "struct", "switch", "typedef", "while"],
    functions: ["scanf", "printf", "fgets", "puts", "malloc", "free", "qsort", "memset", "memcpy", "strlen"],
    snippets: ["for (int i = 0; i < n; ++i)", "scanf(\"%d\", &n);", "printf(\"%d\\n\", answer);"],
    template: `#include <stdio.h>
#include <stdlib.h>
#include <string.h>

int main(void) {
    int n;
    if (scanf("%d", &n) != 1) {
        return 0;
    }

    printf("%d\\n", n);
    return 0;
}
`
  },
  "C++17": {
    name: "C++17",
    extension: "main.cpp",
    comment: "//",
    entrypoint: "int main()",
    keywords: ["auto", "bool", "break", "case", "class", "const", "continue", "else", "for", "if", "int", "long long", "namespace", "return", "sort", "struct", "using", "vector", "while"],
    functions: ["cin", "cout", "sort", "lower_bound", "upper_bound", "push_back", "emplace_back", "begin", "end", "size"],
    snippets: ["ios::sync_with_stdio(false);", "for (int i = 0; i < n; ++i)", "vector<int> a(n);"],
    template: `#include <bits/stdc++.h>
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int n;
    cin >> n;
    cout << n << '\\n';
    return 0;
}
`
  },
  "C++20": {
    name: "C++20",
    extension: "main.cpp",
    comment: "//",
    entrypoint: "int main()",
    keywords: ["auto", "concept", "const", "constexpr", "for", "if", "ranges", "return", "span", "struct", "using", "vector", "while"],
    functions: ["cin", "cout", "ranges::sort", "lower_bound", "upper_bound", "views::iota", "push_back", "size"],
    snippets: ["ranges::sort(a);", "auto answer = 0LL;", "for (auto value : a)"],
    template: `#include <bits/stdc++.h>
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int n;
    cin >> n;
    cout << n << '\\n';
    return 0;
}
`
  },
  Rust: {
    name: "Rust",
    extension: "main.rs",
    comment: "//",
    entrypoint: "fn main()",
    keywords: ["as", "break", "const", "continue", "else", "enum", "fn", "for", "if", "impl", "let", "loop", "match", "mut", "return", "struct", "use", "while"],
    functions: ["read_to_string", "split_whitespace", "parse::<i64>()", "collect::<Vec<_>>()", "sort_unstable", "push", "println!"],
    snippets: ["let mut input = String::new();", "let n: usize = it.next().unwrap().parse().unwrap();", "println!(\"{}\", answer);"],
    template: `use std::io::{self, Read};

fn main() {
    let mut input = String::new();
    io::stdin().read_to_string(&mut input).unwrap();
    let mut it = input.split_whitespace();

    let n: i64 = it.next().unwrap_or("0").parse().unwrap();
    println!("{}", n);
}
`
  },
  Go: {
    name: "Go",
    extension: "main.go",
    comment: "//",
    entrypoint: "func main()",
    keywords: ["break", "case", "const", "continue", "defer", "else", "for", "func", "if", "import", "make", "map", "package", "range", "return", "struct", "type", "var"],
    functions: ["fmt.Fscan", "fmt.Fprintln", "bufio.NewReader", "bufio.NewWriter", "sort.Ints", "append", "len"],
    snippets: ["in := bufio.NewReader(os.Stdin)", "out := bufio.NewWriter(os.Stdout)", "defer out.Flush()"],
    template: `package main

import (
    "bufio"
    "fmt"
    "os"
)

func main() {
    in := bufio.NewReader(os.Stdin)
    out := bufio.NewWriter(os.Stdout)
    defer out.Flush()

    var n int
    fmt.Fscan(in, &n)
    fmt.Fprintln(out, n)
}
`
  },
  "Java 21": {
    name: "Java 21",
    extension: "Main.java",
    comment: "//",
    entrypoint: "public static void main",
    keywords: ["boolean", "break", "case", "class", "continue", "else", "final", "for", "if", "import", "int", "long", "new", "public", "return", "static", "var", "while"],
    functions: ["FastScanner", "nextInt", "nextLong", "StringBuilder", "Arrays.sort", "System.out.println"],
    snippets: ["static class FastScanner", "int n = fs.nextInt();", "System.out.println(answer);"],
    template: `import java.io.*;
import java.util.*;

public class Main {
    public static void main(String[] args) throws Exception {
        FastScanner fs = new FastScanner(System.in);
        int n = fs.nextInt();
        System.out.println(n);
    }

    static class FastScanner {
        private final InputStream in;
        private final byte[] buffer = new byte[1 << 16];
        private int ptr = 0, len = 0;

        FastScanner(InputStream in) {
            this.in = in;
        }

        int nextInt() throws IOException {
            int c;
            do {
                c = read();
            } while (c <= ' ');
            int sign = 1;
            if (c == '-') {
                sign = -1;
                c = read();
            }
            int value = 0;
            while (c > ' ') {
                value = value * 10 + c - '0';
                c = read();
            }
            return value * sign;
        }

        private int read() throws IOException {
            if (ptr >= len) {
                len = in.read(buffer);
                ptr = 0;
                if (len <= 0) return -1;
            }
            return buffer[ptr++];
        }
    }
}
`
  },
  Kotlin: {
    name: "Kotlin",
    extension: "Main.kt",
    comment: "//",
    entrypoint: "fun main()",
    keywords: ["class", "data", "else", "for", "fun", "if", "in", "is", "listOf", "map", "mutableListOf", "return", "val", "var", "when", "while"],
    functions: ["readLine", "split", "map", "toInt", "toLong", "println", "sorted", "MutableList"],
    snippets: ["val n = readLine()!!.trim().toInt()", "repeat(n) { }", "println(answer)"],
    template: `fun main() {
    val n = readLine()?.trim()?.toIntOrNull() ?: 0
    println(n)
}
`
  },
  "Python 3.12": {
    name: "Python 3.12",
    extension: "main.py",
    comment: "#",
    entrypoint: "def solve():",
    keywords: ["and", "break", "class", "continue", "def", "elif", "else", "for", "from", "if", "import", "in", "lambda", "not", "or", "return", "while", "with"],
    functions: ["sys.stdin.read", "map", "list", "range", "enumerate", "sorted", "heapq", "bisect_left", "defaultdict", "print"],
    snippets: ["data = sys.stdin.buffer.read().split()", "n = int(data[0])", "print(answer)"],
    template: `import sys

def solve() -> None:
    data = sys.stdin.buffer.read().split()
    if not data:
        return
    n = int(data[0])
    print(n)

if __name__ == "__main__":
    solve()
`
  },
  JavaScript: {
    name: "JavaScript",
    extension: "main.js",
    comment: "//",
    entrypoint: "function solve(input)",
    keywords: ["const", "let", "var", "function", "return", "if", "else", "for", "while", "break", "continue", "class", "new", "Map", "Set"],
    functions: ["fs.readFileSync", "trim", "split", "map", "Number", "BigInt", "sort", "push", "console.log"],
    snippets: ["const fs = require('fs');", "const input = fs.readFileSync(0, 'utf8').trim();", "console.log(answer);"],
    template: `const fs = require("fs");

const input = fs.readFileSync(0, "utf8").trim();
const data = input.length ? input.split(/\\s+/) : [];
const n = Number(data[0] ?? 0);

console.log(n);
`
  },
  TypeScript: {
    name: "TypeScript",
    extension: "main.ts",
    comment: "//",
    entrypoint: "function solve(input: string)",
    keywords: ["const", "let", "type", "interface", "number", "string", "boolean", "function", "return", "if", "else", "for", "while", "Map", "Set"],
    functions: ["readFileSync", "trim", "split", "map", "Number", "BigInt", "sort", "push", "console.log"],
    snippets: ["import { readFileSync } from 'node:fs';", "const data = input.trim().split(/\\s+/);", "console.log(answer);"],
    template: `import { readFileSync } from "node:fs";

const input = readFileSync(0, "utf8").trim();
const data = input.length ? input.split(/\\s+/) : [];
const n: number = Number(data[0] ?? 0);

console.log(n);
`
  },
  "C#": {
    name: "C#",
    extension: "Program.cs",
    comment: "//",
    entrypoint: "static void Main()",
    keywords: ["bool", "break", "case", "class", "const", "continue", "else", "for", "if", "int", "long", "namespace", "new", "public", "return", "static", "string", "var", "while"],
    functions: ["Console.ReadLine", "Console.WriteLine", "Split", "Array.Sort", "List<T>", "Dictionary<TKey,TValue>", "int.Parse", "long.Parse"],
    snippets: ["var n = int.Parse(Console.ReadLine()!);", "Console.WriteLine(answer);", "Array.Sort(a);"],
    template: `using System;
using System.Collections.Generic;
using System.Linq;

public class Program {
    public static void Main() {
        var line = Console.ReadLine();
        var n = line == null ? 0 : int.Parse(line);
        Console.WriteLine(n);
    }
}
`
  }
};

export function getEditorLanguage(language: string) {
  return editorLanguages[language] ?? editorLanguages["C++17"];
}

export function getLanguageSuggestions(language: string, query: string) {
  const metadata = getEditorLanguage(language);
  const normalizedQuery = query.trim().toLowerCase();
  const values = [...metadata.keywords, ...metadata.functions, ...metadata.snippets];

  if (!normalizedQuery) {
    return values.slice(0, 12);
  }

  return values
    .filter((value) => value.toLowerCase().includes(normalizedQuery))
    .slice(0, 12);
}

export const editorIoHint = commonIoHint;

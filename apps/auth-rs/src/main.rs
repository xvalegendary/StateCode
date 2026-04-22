mod config;
mod models;
mod rating;
mod security;
mod service;
mod store;

use tonic::transport::Server;

use crate::config::AppConfig;
use crate::service::PlatformGrpcService;
use crate::store::AppStore;

pub mod proto {
    tonic::include_proto!("statecode.platform.v1");
}

use proto::platform_service_server::PlatformServiceServer;

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let config = AppConfig::from_env();
    let (store, bootstrap) =
        AppStore::initialize(config.db_path.clone(), config.admin_credentials_path.clone()).await?;

    println!(
        "[auth-rs] platform gRPC server listening on {}; sqlite db: {}",
        config.grpc_address,
        config.db_path.display()
    );

    if let Some(path) = bootstrap.admin_credentials_path {
        println!(
            "[auth-rs] bootstrap admin account created; credentials written to {}",
            path.display()
        );
    }

    let service = PlatformGrpcService { store };

    Server::builder()
        .add_service(PlatformServiceServer::new(service))
        .serve(config.grpc_address.parse()?)
        .await?;

    Ok(())
}

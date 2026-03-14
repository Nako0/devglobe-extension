use zed_extension_api as zed;

struct DevGlobeExtension;

impl zed::Extension for DevGlobeExtension {
    fn new() -> Self {
        Self
    }

    fn context_server_command(
        &mut self,
        _server_id: &zed::ContextServerId,
        _project: &zed::Project,
    ) -> zed::Result<zed::Command> {
        Ok(zed::Command {
            command: "node".to_string(),
            args: vec![
                format!("{}/server/devglobe-server.js", env!("CARGO_MANIFEST_DIR")),
            ],
            env: Default::default(),
        })
    }
}

zed::register_extension!(DevGlobeExtension);

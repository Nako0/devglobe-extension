use zed_extension_api::{self as zed};

const SERVER_PATH: &str = concat!(env!("CARGO_MANIFEST_DIR"), "/server/dist/server.js");

struct DevGlobeExtension;

fn find_node(worktree: &zed::Worktree) -> zed::Result<String> {
    if let Some(path) = worktree.which("node") {
        return Ok(path);
    }
    Err("Node.js not found. Install Node.js 18+ to use DevGlobe.".into())
}

impl zed::Extension for DevGlobeExtension {
    fn new() -> Self {
        Self
    }

    fn language_server_command(
        &mut self,
        _language_server_id: &zed::LanguageServerId,
        worktree: &zed::Worktree,
    ) -> zed::Result<zed::Command> {
        let node = find_node(worktree)?;
        Ok(zed::Command {
            command: node,
            args: vec!["--".to_string(), SERVER_PATH.to_string(), "lsp".to_string()],
            env: worktree.shell_env(),
        })
    }
}

zed::register_extension!(DevGlobeExtension);

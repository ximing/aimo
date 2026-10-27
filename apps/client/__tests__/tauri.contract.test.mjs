import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it } from 'node:test';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (relative) => readFileSync(path.join(root, relative), 'utf8');

describe('Tauri desktop contract', () => {
  const conf = JSON.parse(read('src-tauri/tauri.conf.json'));
  const cargo = read('src-tauri/Cargo.toml');
  const lib = read('src-tauri/src/lib.rs');
  const caps = JSON.parse(read('src-tauri/capabilities/default.json'));
  const pkg = JSON.parse(read('package.json'));

  it('loads the hosted site in production and vite on 5173 in dev', () => {
    assert.equal(conf.identifier, 'com.aimo.app');
    assert.equal(conf.productName, 'AIMO');
    assert.equal(conf.version, '0.9.10');
    assert.equal(conf.build.devUrl, 'http://localhost:5173');
    assert.equal(conf.build.frontendDist, 'https://aimo.plus');
    assert.equal(conf.build.beforeBuildCommand, undefined);
    assert.equal(conf.app.withGlobalTauri, false);
    assert.equal(caps.remote, undefined);
    assert.equal(caps.local, true);
  });

  it('uses a 1200x800 window with a native title bar', () => {
    const win = conf.app.windows[0];
    assert.equal(win.label, 'main');
    assert.equal(win.create, false);
    assert.match(lib, /install_main_window/);
    assert.match(lib, /NewWindowResponse::Deny/);
    assert.equal(win.width, 1200);
    assert.equal(win.height, 800);
    assert.equal(win.minWidth, 800);
    assert.equal(win.minHeight, 600);
    assert.notEqual(win.decorations, false);
    assert.ok(win.titleBarStyle === undefined || win.titleBarStyle === 'Visible');
  });

  it('keeps window state and does not expose http, store, or a status icon', () => {
    assert.match(lib, /tauri_plugin_window_state::Builder/);
    assert.match(lib, /StateFlags::VISIBLE/);
    assert.match(cargo, /tauri-plugin-window-state/);
    assert.doesNotMatch(lib, /TrayIconBuilder/);
    assert.doesNotMatch(lib, /icon_as_template/);
    assert.doesNotMatch(lib, /tauri_plugin_http/);
    assert.doesNotMatch(lib, /tauri_plugin_store/);
    assert.doesNotMatch(cargo, /tray-icon/);
    assert.doesNotMatch(cargo, /tauri-plugin-http/);
    assert.doesNotMatch(cargo, /tauri-plugin-store/);
  });

  it('registers a native menu with reload, edit shortcuts, and quit', () => {
    assert.match(lib, /\.menu\(build_menu\)/);
    assert.match(lib, /CmdOrCtrl\+R/);
    assert.match(lib, /重新加载/);
    assert.match(lib, /window\.reload\(\)/);
    assert.match(lib, /PredefinedMenuItem::copy/);
    assert.match(lib, /PredefinedMenuItem::paste/);
    assert.match(lib, /PredefinedMenuItem::select_all/);
    assert.match(lib, /PredefinedMenuItem::quit/);
    assert.match(lib, /https:\/\/github\.com\/ximing\/aimo/);
  });

  it('shows the shell version from package_info', () => {
    assert.match(lib, /package_info\(\)\.version/);
    assert.match(lib, /版本/);
    assert.match(lib, /AboutMetadata/);
    assert.match(lib, /version: Some\(version/);
  });

  it('on macOS, the red close button hides instead of quitting', () => {
    assert.match(lib, /CloseRequested/);
    assert.match(lib, /prevent_close/);
    assert.match(lib, /window\.hide\(\)/);
    assert.match(lib, /label\(\) == MAIN_LABEL/);
    assert.match(lib, /RunEvent::Reopen/);
    assert.match(lib, /target_os = "macos"/);
  });

  it('opens off-site links outside the shell and keeps the page on the configured origin', () => {
    assert.match(lib, /on_navigation/);
    assert.match(lib, /is_app_navigation/);
    assert.match(lib, /external_link_url/);
    assert.match(lib, /fn shell_origin/);
    assert.match(lib, /dev_url/);
    assert.match(lib, /frontend_dist/);
    assert.match(lib, /FrontendDist::Url/);
    assert.doesNotMatch(lib, /__AIMO_HOST__/);
    assert.doesNotMatch(lib, /append_invoke_initialization_script/);
  });

  it('ad-hoc signs macOS bundles so Apple Silicon is not marked damaged', () => {
    assert.equal(conf.bundle.macOS.signingIdentity, '-');
  });

  it('does not depend on the web bundle or Tauri JS plugins', () => {
    const deps = { ...pkg.dependencies, ...pkg.devDependencies };
    assert.equal(deps['@aimo/web'], undefined);
    assert.equal(deps['@tauri-apps/api'], undefined);
    assert.equal(deps.electron, undefined);
    assert.equal(pkg.scripts.dev, 'tauri dev');
    assert.equal(pkg.scripts.dist, 'tauri build');
  });

  it('has a GitHub workflow that builds Windows, macOS, and Linux', () => {
    const workflow = read('../../.github/workflows/build-desktop.yml');
    assert.match(workflow, /push:/);
    assert.match(workflow, /- master/);
    assert.match(workflow, /gh release create desktop/);
    assert.match(workflow, /windows-latest/);
    assert.match(workflow, /macos-latest/);
    assert.match(workflow, /ubuntu-22\.04/);
    assert.match(workflow, /tauri-apps\/tauri-action@v1/);
    assert.match(workflow, /projectPath: apps\/client/);
    assert.match(workflow, /tagName: desktop/);
    assert.match(workflow, /releaseId:/);
    assert.match(workflow, /AIMO_WEB_URL/);
    assert.match(workflow, /aimo\.plus/);
    assert.match(workflow, /frontendDist/);
    assert.doesNotMatch(workflow, /electron-builder/);
  });
});

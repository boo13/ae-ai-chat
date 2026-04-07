import { company, displayName, version } from "../../../shared/shared";
import {
  copySelectionInPanelScope,
  keyRegisterOverride,
  dropDisable,
  installClipboardShortcuts,
  selectAllInPanelScope,
} from "./cep";

const buildFlyoutMenu = () => {
  const menu = `<Menu>
  <MenuItem Id="info" Label="${displayName} ${version}" Enabled="false" Checked="false"/>
  <MenuItem Id="website" Label="by ${company}" Enabled="false" Checked="false"/>
  <MenuItem Label="---" />
  <MenuItem Id="refresh" Label="Refresh" Enabled="true" Checked="false"/>
  </Menu>`;

  interface FlyoutMenuEvent {
    data:
      | {
          menuId: string;
        }
      | string;
  }
  const flyoutHandler = (event: FlyoutMenuEvent) => {
    let menuId;
    if (typeof event.data === "string") {
      try {
        //? On build the events come in garbled string which requires some replacing and then parsing to get the data
        menuId = JSON.parse(
          event.data.replace(/\$/g, "").replace(/\=2/g, ":")
        ).menuId;
      } catch (e) {
        console.error(e);
      }
    } else {
      menuId = event.data.menuId;
    }
    if (menuId === "website") {
      // openLinkInBrowser(homePage);
    } else if (menuId === "info") {
      // openLinkInBrowser(productPage);
    } else if (menuId === "refresh") {
      location.reload();
    }
  };

  window.__adobe_cep__.invokeSync("setPanelFlyoutMenu", menu);
  window.__adobe_cep__.addEventListener(
    "com.adobe.csxs.events.flyoutMenuClicked",
    flyoutHandler
  );
};

const buildContextMenu = () => {
  console.log("buildContextMenu");
  const runEditCommand = (command: "copy" | "cut" | "paste" | "selectAll") => {
    if (typeof document.execCommand === "function") {
      document.execCommand(command);
    }
  };

  const menuObj = {
    menu: [
      {
        label: "Copy",
        enabled: true,
        checked: false,
        checkable: false,
        id: "edit-copy",
      },
      {
        label: "Cut",
        enabled: true,
        checked: false,
        checkable: false,
        id: "edit-cut",
      },
      {
        label: "Paste",
        enabled: true,
        checked: false,
        checkable: false,
        id: "edit-paste",
      },
      {
        label: "Select All",
        enabled: true,
        checked: false,
        checkable: false,
        id: "edit-select-all",
      },
      {
        label: "---",
      },
      {
        label: "Reload",
        enabled: true,
        checked: false,
        checkable: false,
        id: "panel-reload",
      },
      {
        label: "Force Reload",
        enabled: true,
        checked: false,
        checkable: false,
        id: "panel-force-reload",
      },
    ],
  };
  window.__adobe_cep__.invokeAsync(
    "setContextMenuByJSON",
    JSON.stringify(menuObj),
    (e: string) => {
      switch (e) {
        case "edit-copy":
          copySelectionInPanelScope();
          break;
        case "edit-cut":
          runEditCommand("cut");
          break;
        case "edit-paste":
          runEditCommand("paste");
          break;
        case "edit-select-all":
          selectAllInPanelScope();
          break;
        case "panel-reload":
          location.reload();
          break;
        case "panel-force-reload":
          process.abort();
          break;
      }
    }
  );
};

export const initializeCEP = () => {
  buildFlyoutMenu();
  buildContextMenu();
  keyRegisterOverride(); // Capture edit shortcuts before the host app swallows them
  installClipboardShortcuts();
  dropDisable(); // to prevent drop files on panel and taking over
};

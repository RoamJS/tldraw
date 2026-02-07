// tldrawStyles.ts because some of these styles need to be inlined
export default /* css */ `


  /* Hide Roam Blocks only when a canvas is present under the root */
  .roam-article:has(.roamjs-tldraw-canvas-container) .rm-block-children  {
    display: none;
  }
  
  /* Hide Roam Blocks in sidebar when a canvas is present */
  .rm-sidebar-outline:has(.roamjs-tldraw-canvas-container) .rm-block-children {
    display: none;
  }
  
  /* Shape Render Fix */
  svg.tl-svg-container {
    overflow: visible;
  }
  
  /* CANVAS */
  /* fixes drawing arrows in north-west direction */
  /* and selection context not being shown */
  .roamjs-tldraw-canvas-container svg {
    overflow: visible;
  }
  
  /* Roam's font-family is hijacking tldraw's */
  .tl-text-wrapper[data-font="draw"] div {
    font-family: var(--tl-font-draw);
  }
  .tl-text-wrapper[data-font="sans"] div {
    font-family: var(--tl-font-sans);
  }
  .tl-text-wrapper[data-font="serif"] div {
    font-family: var(--tl-font-serif);
  }
  .tl-text-wrapper[data-font="mono"] div {
    font-family: var(--tl-font-mono);
  }
  
  /* Keyboard Shortcuts */
  kbd.tlui-kbd {
    background-color: initial;
    box-shadow: initial;
    border-radius: initial;
    padding: initial;
  }

/* Maximize Tldraw Canvas */
/* Used in conjunction with tailwind classes on the canvas container */
.roam-body .roam-app .roam-main .roam-article.rjs-tldraw-maximized,
.roam-body .roam-app .roam-main .rm-sidebar-outline.rjs-tldraw-maximized {
  position: static;
}

/* Clipboard toggle button in toolbar */
.tlui-toolbar__lock-button[data-clipboard-open="true"]::after {
  background-color: var(--color-muted-2);
  opacity: 1;
}

/* Roam's main container should be static when tldraw is maximized */
.roam-main {
  position: relative;
}

/* Node inspector active row style */
.roamjs-node-inspector .bp3-menu-item {
  text-decoration: none;
}
.roamjs-node-inspector .bp3-menu-item:hover {
  text-decoration: none;
  background-color: #dadddf;
}

.roamjs-node-inspector .bp3-menu-item.bp3-active,
.roamjs-node-inspector .bp3-menu-item.bp3-active:hover {
  background-color: #dadddf;
  color: inherit;
  text-decoration: none;
}
`;

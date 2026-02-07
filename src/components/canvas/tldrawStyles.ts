export default /* css */ `
.roam-article:has(.roamjs-tldraw-canvas-container) .rm-block-children {
  display: none;
}

.rm-sidebar-outline:has(.roamjs-tldraw-canvas-container) .rm-block-children {
  display: none;
}

.roamjs-tldraw-canvas-container svg {
  overflow: visible;
}

.roam-body .roam-app .roam-main .roam-article.rjs-tldraw-maximized,
.roam-body .roam-app .roam-main .rm-sidebar-outline.rjs-tldraw-maximized {
  position: static;
}
`;

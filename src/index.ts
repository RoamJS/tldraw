import runExtension from "roamjs-components/util/runExtension";

export default runExtension(async ({ extensionAPI }) => {
  extensionAPI.settings.panel.create({
    tabTitle: "Extension",
    settings: [
      {
        id: "enabled",
        name: "Enable",
        description: "Turn the extension on or off",
        action: { type: "switch" },
      },
    ],
  });

  const enabled = extensionAPI.settings.get("enabled") as boolean | undefined;
  if (enabled === false) return;

  // Add your extension logic here.
  // Use roamjs-components: dom/*, queries/*, writes/*, util/*, components/*

  return {
    unload: () => {
      // Clean up observers, listeners, command palette, etc.
    },
  };
});

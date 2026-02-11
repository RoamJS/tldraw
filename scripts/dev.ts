import esbuild from "esbuild";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import { compile, args } from "./compile";

dotenv.config();

const dev = () => {
  process.env.NODE_ENV = process.env.NODE_ENV || "development";
  return new Promise<number>((resolve) => {
    compile({
      opts: args,
      builder: (opts: esbuild.BuildOptions) => {
        const outFile = path.join(process.cwd(), "dist", "extension.js");
        const rootFile = path.join(process.cwd(), "extension.js");
        const outCssFile = path.join(process.cwd(), "dist", "extension.css");
        const rootCssFile = path.join(process.cwd(), "extension.css");
        // Keep a root extension.js so Roam dev loading can target tldraw/ instead of tldraw/dist/.
        const copyOutputPlugin: esbuild.Plugin = {
          name: "copy-output-to-root",
          setup(build) {
            build.onEnd((result) => {
              if (result.errors.length) return;
              if (fs.existsSync(outFile)) {
                fs.cpSync(outFile, rootFile);
              }
              if (fs.existsSync(outCssFile)) {
                fs.cpSync(outCssFile, rootCssFile);
              }
            });
          },
        };
        return esbuild
          .context({
            ...opts,
            plugins: [...(opts.plugins || []), copyOutputPlugin],
          })
          .then((esb) => esb.watch());
      },
    });
    process.on("exit", resolve);
  });
};

const main = async () => {
  try {
    await dev();
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
};
if (require.main === module) main();

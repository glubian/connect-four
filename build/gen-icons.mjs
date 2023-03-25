import * as path from "path";
import { promises as fs } from "fs";
import * as svgo from "svgo";

const svgoConfig = {
  plugins: [
    {
      name: "preset-default",
      params: {
        overrides: {
          convertColors: false,
        },
      },
    },
  ],
};

function svgURL(content) {
  const uri = encodeURI("data:image/svg+xml," + content);
  return `"${uri}"`;
}

export default async function main() {
  const srcIconsDir = path.resolve("gen", "src", "icons");
  const distDir = path.resolve("gen", "dist");
  const iconFilenames = await fs.readdir(srcIconsDir);

  let output = "";

  for (const iconFilename of iconFilenames) {
    const iconPath = path.resolve(srcIconsDir, iconFilename);
    console.log("Processing " + iconPath);
    const content = await fs.readFile(iconPath, {
      encoding: "utf8",
    });
    const optimizedContent = svgo.optimize(content, svgoConfig).data;
    const url = svgURL(optimizedContent);
    const [name] = iconFilename.split(".");
    output += `$${name}: ${url};\n`;
  }

  await fs.mkdir(distDir).catch(() => {});

  const distPath = path.resolve(distDir, "icons.scss");
  console.log("Writing " + distPath);
  await fs.writeFile(distPath, output, { encoding: "utf8" });
}

await main();

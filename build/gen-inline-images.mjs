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
  const srcImagesDir = path.resolve("gen", "src", "inline-images");
  const distDir = path.resolve("gen", "dist");
  const imageFilenames = await fs.readdir(srcImagesDir);

  let output = "";

  for (const imageFilename of imageFilenames) {
    const imagePath = path.resolve(srcImagesDir, imageFilename);
    console.log("Processing " + imagePath);
    const content = await fs.readFile(imagePath, {
      encoding: "utf8",
    });
    const optimizedContent = svgo.optimize(content, svgoConfig).data;
    const url = svgURL(optimizedContent);
    const [name] = imageFilename.split(".");
    output += `$${name}: ${url};\n`;
  }

  await fs.mkdir(distDir).catch(() => {});

  const distPath = path.resolve(distDir, "inline-images.scss");
  console.log("Writing " + distPath);
  await fs.writeFile(distPath, output, { encoding: "utf8" });
}

await main();

const glob = require("glob");
const core = require("@actions/core");
const path = require("path");

const SUBGRAPHS_PARENT_DIR = "subgraphs";

(() => {
  if (!process.env.CHANGED_FILES) {
    return;
  }

  let files = JSON.parse(process.env.CHANGED_FILES);
  if (!files || files.length === 0) {
    return;
  }

  const subgraphsChanged = {};
  for (let file of files) {
    const { path, exists } = getSubgraphPath(file);
    if (!exists) {
      continue;
    }

    subgraphsChanged[path] = true;
  }

  console.log(subgraphsChanged);
  core.setOutput(Object.keys(subgraphsChanged));
})();

function getSubgraphPath(path) {
  if (!path) {
    return { exists: false };
  }

  const split = path.split("/");
  const root = split[0];

  if (root != SUBGRAPHS_PARENT_DIR) {
    return { exists: false };
  }

  if (split.length === 2) {
    // files inside ./subgraphs are not part of any given one
    return { exists: false };
  }

  const sName = split[1];
  const fileName = split[split.length - 1];

  if (isIgnorableFile(fileName)) {
    return { exists: false };
  }

  if (isReference(sName)) {
    return { exists: false };
  }

  if (isForkPath(sName)) {
    // todo, ignore for now
  }

  return subgraphExistsOnPath(split);
}

function subgraphExistsOnPath(splitPath) {
  let filePath = `${splitPath[0]}/${splitPath[1]}`;
  let depth = 2;

  while (true) {
    const fsFound = glob.sync(
      path.normalize(`${__dirname}/../../${filePath}/subgraph.y*ml`),
      {
        nocase: true,
      }
    );
    if (fsFound && fsFound.length > 0) {
      return {
        path: filePath,
        exists: true,
      };
    }

    if (depth == splitPath.length - 1) {
      // we've reached the last file in the tree.
      return { exists: false };
    }

    filePath += `/${splitPath[depth]}`;
    depth++;
  }
}

function isReference(subgraphName) {
  return subgraphName === "_reference_";
}

function isForkPath(subgraphDirName) {
  const forkDirs = ["aave-v2-forks", "compound-forks", "uniswap-forks"];

  return forkDirs.includes(subgraphDirName.toLowerCase());
}

// isIgnorableFile returns true if the modification of the file cannot break
// or change a given subgraph.
function isIgnorableFile(fileName) {
  const ignorableFiles = [
    ".eslintrc.json",
    ".gitignore",
    ".prettierignore",
    ".prettierrc.json",
    "dockerfile",
    "readme.md",
    "tsconfig.json",
    "changes.md",
    "license",
  ];

  return ignorableFiles.includes(fileName.toLowerCase());
}

type CommentSyntax = {
  singleLine?: string | string[];
  multiLine?: {
    prefix: string;
    suffix: string;
  };
};

const cStyle = new Set([
  "js",
  "cjs",
  "mjs",
  "ts",
  "tsx",
  "c",
  "cpp",
  "cc",
  "cxx",
  "h",
  "hpp",
  "hh",
  "dart",
  "rs",
  "java",
  "cs",
  "m",
  "mm",
  "swift",
  "kt",
  "kts",
  "go",
  "scala",
  "sc",
  "groovy",
  "gvy",
  "gy",
  "gsh",
  "as",
  "coffee",
  "hx",
  "glsl",
  "vert",
  "frag",
  "pde",
  "ino",
  "v",
  "vh",
  "sv",
  "svh",
  "vhd",
  "vhdl",
  "aspx",
  "ascx",
  "fs",
  "fsi",
  "fsx",
  "nim",
  "d",
  "hs",
  "shader",
  "compute",
  "uc",
  "jl",
  "vala",
  "zig",
  "p",
  "pwn",
  "inc",
  "e",
  "sml",
  "sig",
  "m",
  "int",
  "mm",
  "idl",
  "asm",
  "cl",
  "il",
  "wren",
  "chpl",
  "j",
  "ms",
  "n",
]);

const xmlStyle = new Set([
  "xml",
  "html",
  "xhtml",
  "svg",
  "xsd",
  "xslt",
  "config",
  "wsdl",
  "xaml",
  "plist",
]);

const shStyle = new Set([
  "sh",
  "bash",
  "zsh",
  "ksh",
  "csh",
  "tcsh",
  "py",
  "rake",
  "gemspec",
  "pl",
  "pm",
  "t",
  "cgi",
  "sed",
  "awk",
  "yml",
  "yaml",
  "jsonnet",
  "dockerfile",
  "gitignore",
  "gitdiffignore",
  "gitattributes",
  "gitmodules",
  "env",
  "mk",
  "make",
  "m",
  "r",
  "R",
  "Rmd",
  "nimble",
  ".nim.cfg",
  "cfg",
  "ini",
  "conf",
  "toml",
  "ron",
  "bzl",
  "bazel",
  "j2",
  "jinja",
  "Jinja2",
  "pp",
  "props",
  "gradle",
  "bats",
  "fish",
  "nuspec",
  "ps1",
  "psm1",
]);

const phpStyle = new Set(["php", "php3", "php4", "php5", "php7", "phps"]);

export function getCommentSyntax(ext: string): CommentSyntax | undefined {
  if (cStyle.has(ext)) {
    return {
      singleLine: "//",
      multiLine: {
        prefix: "/*",
        suffix: "*/",
      },
    };
  }
  if (xmlStyle.has(ext)) {
    return {
      multiLine: {
        prefix: "<!--",
        suffix: "-->",
      },
    };
  }
  if (shStyle.has(ext)) {
    return {
      singleLine: "#",
    };
  }
  if (phpStyle.has(ext)) {
    return {
      singleLine: ["//", "#"],
      multiLine: {
        prefix: "/*",
        suffix: "*/",
      },
    };
  }
  if (ext === "rb") {
    return {
      singleLine: "#",
      multiLine: {
        prefix: "=begin",
        suffix: "=end",
      },
    };
  }
}

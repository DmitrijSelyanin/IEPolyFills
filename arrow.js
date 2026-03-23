function rewriteArrowFunctions(source) {
    // Remove comments first so we don't rewrite inside them
    var withoutComments = source
        .replace(/\/\/.*$/gm, "")
        .replace(/\/\*[\s\S]*?\*\//gm, "");

    // 1. Parenthesized parameters: (x, y) => expression
    withoutComments = withoutComments.replace(
        /\(([A-Za-z0-9_$,\s]*)\)\s*=>\s*([^{};][^;]*)/g,
        "function($1){ return $2 }"
    );

    // 2. Parenthesized parameters with block body: (x, y) => { ... }
    withoutComments = withoutComments.replace(
        /\(([A-Za-z0-9_$,\s]*)\)\s*=>\s*\{/g,
        "function($1){"
    );

    // 3. Single parameter: x => expression
    withoutComments = withoutComments.replace(
        /\b([A-Za-z_$][A-Za-z0-9_$]*)\s*=>\s*([^{};][^;]*)/g,
        "function($1){ return $2 }"
    );

    // 4. Single parameter with block body: x => { ... }
    withoutComments = withoutComments.replace(
        /\b([A-Za-z_$][A-Za-z0-9_$]*)\s*=>\s*\{/g,
        "function($1){"
    );

    return withoutComments;
}
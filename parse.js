import { builtin, lex, todo } from "./fragment.js";

const mrtest = {
    pre: patchcomments,
    mat: [
        //move atdoc and string to preparse step
        // ["atdoc",
        //     /(@\([a-zA-Z][a-zA-Z0-9_]*\).*?@)|(@\([a-zA-Z][a-zA-Z0-9_]*\).*)/,
        // ],
        
        // ["string", /["](?:\\["\\]|[^\n"\\])*["]/],
        
        // ["number", /-?\b[0-9]+(\.[0-9]+)*/], ///\b-?(0|[1-9][0-9]*)\.?(0|[1-9][0-9]*)?/],
        
        ["keyword", {
            enum: /\benum\b/,
            func: /\bfunc\b/,
            class: /\bclass\b/,
            operator: /\boperator\b/,
            mixin: /\bmixin\b/,
            mod: /\bmod\b/,
            extends: /\bextends\b/,
            import: /\bimport\b/,
            as: /\bas\b/
        }],
        ["keyword.control", {
            if: /\bif\b/,
            loop: /\bloop\b/,
            let: /\blet\b/,
            const: /\bconst\b/,
            while: /\bwhile\b/,
            for: /\bfor\b/,
            return: /\breturn\b/,
            in: /\bin\b/,
            of: /\bof\b/
        }],
        
        ["type", {
            simple: /:[a-zA-Z_]+:/,
            generic: /:'[a-zA-Z_]+:/,
            // "generic.call":/:[a-zA-Z_]+\(([a-zA-Z_]+(\s|\t)*,(\s|\t)*)+\):/
            // ls: ":"
            other: /:[a-zA-Z0-9_,\.\(\)\[\]']*?:/,
        }],
        ["bool", {
            true:/\btrue\b/,
            false:/\bfalse\b/
        }],
        ["ident", /[a-zA-Z][a-zA-Z0-9_]*/],
        
        ["num",/(-?\b[0-9]+(\.[0-9]+)*)|0/],

        ["sep", /,/],
        
        ["equality", {
            eq: /==/,
            ne: /!=/,
            // ce:/===/,
            // nc:/!==/
        }],
        
        ["op", {
            add: /\+/,
            neg: /-/,
            mul: /\*/,
            div: /\//,
            mod: /%/,
            exp: /\^/,
            range: /\.\./
        }],

        ["period", /\./],
        
        builtin.block("array", /\[/, /\]/),
        builtin.block("block", "{", "}"),
        builtin.block("param", /\(/, /\)/),

        ["ws", {
            nl: /\r?\n/,
            ws: /\s|\t/,
        }],
    ],

    callback: {
        num(tkn) {
            // console.log(tkn);
            return parseFloat(tkn);
        },
        atdoc(tkn) {
            todo("post parse and enable debugout for atdoc")
            // console.log(/(@\(([a-zA-Z][a-zA-Z0-9_]*)\).*?@)|(@\(([a-zA-Z][a-zA-Z0-9_]*)\).*)/.exec(tkn))
            // console.log(tkn.substring((tkn.split("@(")[1].split(")")[0]).length+3).trim())
            // return {
            //     ident: tkn.split("@(")[1].split(")")[0],
            //     text: tkn.substring((tkn.split("@(")[1].split(")")[0]).length + 3)
            //         .trim(),
            // };
            return tkn
        },
        number(tkn) {
            return parseInt(tkn);
        },
    },

    parser: {
        meta: {
            blocks: ["block","param","array"],
        },
        passes: [
            (tkns, rule) => {
                let depth = 0;
                let maxdepth = 0;
                let idstack = [];
                for (let i = 0; i < tkns.length; i++) {
                    for (let j = 0; j < rule.parser.meta.blocks.length; j++) {
                        let ty = rule.parser.meta.blocks[j].type;
                        if (tkns[i].type == ty + ".open") {
                            depth++;
                            idstack.push(ty);
                        }
                        if (tkns[i].type == ty + ".close") {
                            if (idstack.length > 0) {
                                let pp = idstack.pop();
                                if (ty == pp) depth--;
                                else todo("error: scope ended with unexpected symbol");
                            } else todo("error: unexpected end of scope");
                        }
                    }
                    tkns[i].depth = depth;
                    maxdepth = Math.max(depth, maxdepth);
                }
                todo("block based on depth (linear time)");

                return tkns;
            },
        ],
    },
    debugout:{
        enable:true,
        exact:{
            num: 31,
            string: 32,
            ident: "3m\x1b[38;2;242;176;94",
            atdoc: 31
        },
        partial:[
            ["keyword",35],
            ["type",34],
            ["op",33],
            ["eq", 33]
        ],
        exacpost:{
            string:(tkn)=>("\""+tkn.value.substring(1)+"\"")
        },
        obj:(tkn)=>{
            // if (tkn.type == "atdoc") return ("\x1b[31m@(" + tkn.value.ident + ") " + tkn.value.text + "\x1b[0m ")

            return tkn.value
        }
    },
    linecount: ["ws.nl"],
    exclude: [
        "ws.nl",
        "ws.ws"
    ],
};

let parser = {
    meta: {},
    main: (tkns, parser) => { },
    try: {
        func: (tkns, parser) => { },
    },
};
function parsetep(tkns, parser) {
    //todo
}

export function parse(file) {
    return lex(file, mrtest);
}

function patchcomments(code) {
    let inat = false,
        instring = false,
        incomment = false,
        record = "",
        atrc = "",
        strc = "",
        tnrec = []

    for (let i = 0; i < code.length; i++) {
        if (
            code[i] == '"' &&
            !(code[i - 1] == "\\" && code[i - 2] != "\\") &&
            !incomment && !inat
        ) {
            instring = !instring;
            if (instring) {
                tnrec.push({ type: "unsear", value: record})
                record = ""
                strc+=" "
                continue
            } else {
                tnrec.push({ type: "string", value: strc})
                record+=" "
                strc = ""
                continue
            }
        } else if ((code[i] == "#" || (code[i] == "\n" && incomment)) && !inat && !instring) {
            incomment = !incomment
            if (code[i]=="\n") 
                record+="\n"
            else 
                record+=" "
            continue
        } else if (((code[i] == "@" && !(code[i - 1] == "\\" && code[i - 2] != "\\")) || (code[i] == "\n" && inat)) && !incomment && !instring) {
            todo("proper atdoc value patchcomments")
            inat = !inat
            if (inat) {
                tnrec.push({ type: "unsear", value: record})
                record = ""
            } else {
                tnrec.push({ type: "atdoc", value: atrc})
                record+=" "
                atrc = ""
                continue
            }
        }

        if (code[i]=="\n") 
            record+="\n"
        else if (!incomment) {
            if (inat) {
                atrc+=code[i]
            } else if (instring) {
                strc+=code[i]
            } else record+=code[i]
        } else record+=" "
    }

    // console.log(record)
    tnrec.push({ type: "unsear", value: record})

    return tnrec
}

/* statements (in order)

class
function
extend
enum
operator
if
loop
match
math
dot complex ('call | ident + 'dot + call | 'ident)
call ('ident+"param)

 - parse structure

main {
    class(also struct) {
        function {
            key.func ident shadow
            key.func ident param shadow
            key.func type ident shadow
            key.func type ident param shadow
        }
        operator {
            key.operator op ident param shadow
        }
        feild {
            key.feild ident
            key.feild ident op.eq value
            key.feild type ident
            key.feild type ident op.eq value
        }
    }
    function {
        key.func ident shadow
        key.func ident param shadow
        key.func type ident shadow
        key.func type ident param shadow
    }
    enum {
        key.enum ident {
            ident *
            ident param *
        }
        key.enum ident type {
            ident *
            ident param *
        }
    }
}

*/

/*
parser: {
        meta: {
            blocks: [{
                type: "block",
                parse: (tkns, rules) => {
                    return metaparse(tkns, rules)
                }
            }, {
                type: "param",
                parse: (tkns, rules) => {
                    todo("param parse")
                }
            }],
        },
        passes: [
            (tkns, rule) => {
                let depth = 0;
                let maxdepth = 0;
                let idstack = []
                for (let i = 0; i < tkns.length; i++) {
                    for (let j = 0; j < rule.parser.meta.blocks.length; j++) {
                        let ty = rule.parser.meta.blocks[j].type;
                        if (tkns[i].type == ty + ".open") {
                            depth++
                            idstack.push(ty)
                        }
                        if (tkns[i].type == ty + ".close") {
                            if (idstack.length > 0) {
                                let pp = idstack.pop()
                                if (ty == pp) depth--
                                else todo("error: scope ended with unexpected symbol")
                            } else todo("error: unexpected end of scope")
                        }
                    }
                    tkns[i].depth = depth
                    maxdepth = Math.max(depth, maxdepth)
                }
                todo("block based on depth (linear time)")

                return tkns
            },
            (tkns, rule) => {
                let eend = ""
                for (let i = 0; i < tkns.length; i++) {
                    eend += ("        ".repeat(tkns[i].depth)) + tkns[i].value + "\n"
                }
                console.log(eend)
                return tkns
            }
        ]
    },
//*/

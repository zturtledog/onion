import { parse } from "./parse.js";

// console.log(Deno.args)
// console.log
Deno.writeTextFileSync("examples/ast.json",JSON.stringify(
(parse(await Deno.readTextFile(Deno.args[0])))
,null,2))

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

//*/
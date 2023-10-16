//builtin
export const builtin = {
    block: function(name,open,close) {
        return [name,{
            open,close
        }]
    }
}

//util

let todoreps = []
export function todo(s) {
    if (!todoreps.includes(s)) {
        todoreps.push(s)
        console.info("todo: '"+s+"'")
    }
}
export function ansi(code) {
    return `\x1b[${code}m`
}
export function ansirgb(r,g,b) {
    return `38;2;${r};${g};${b}`
}

//fragment
export function lex(code, rules) {
    let pre = rules.pre?rules.pre(code,rules):code
    
    let tokenpatterns = []
    for (let i = 0; i < rules.mat.length; i++) {
        tokenpatterns = mixlist(tokenpatterns,parsemat(rules.mat[i]))        
    }
    rules.mat = tokenpatterns
    
    todo("re-write tokenlines to be linear time (regex-rs via ffi?)")

    let lexed = tokenize(pre,rules)//tokenlines(pre,rules)

    if (rules.linecount) {
        let nl = 1;
        let col = 0;
        for (let i = 0; i < lexed.length; i++) {
            if (rules.linecount.includes(lexed[i].type)) {
                nl++;
                col = -1;
            }
            lexed[i].line = nl;
            lexed[i].col = col;
            // console.log("'"+lexed[i].value+"' : "+(lexed[i].value+"").length)
            col += (lexed[i].value+"").length;
        }
    }

    if (rules.debugout && rules.debugout.enable) dbgprnt(lexed, rules)
      
    if (rules.exclude) {
        let end = []
        for (let i = 0; i < lexed.length; i++) {
            if (!rules.exclude.includes(lexed[i].type)) {
                end.push(lexed[i])
            }
        }
        lexed = end
    }
    
    lexed = metaparse(lexed,rules)
    
    return lexed
}
function dbgprnt(tkns, rules) {
    let eend = "";

    // enable:true,
    // exact:{
    //     num: 31,
    //     string: 32,
    //     ident: "3m\x1b[38;2;242;176;94"
    // },
    // partial:[
    //     ["keyword",35],
    //     ["type",34],
    //     ["op",33],
    //     ["eq", 33]
    // ],
    // obj:(tkn,_tkns,_rule)=>{}

    for (let i = 0; i < tkns.length; i++) {
        let conx = 30; //Math.round(Math.random()*6+30) //30 - 36
        
        if (rules.debugout.exact) if (rules.debugout.exact[tkns[i].type]) conx = rules.debugout.exact[tkns[i].type]
        if (rules.debugout.partial && conx == 30) {
            for (let j = 0; j < rules.debugout.partial.length; j++) {
                if (tkns[i].type.startsWith(rules.debugout.partial[j][0])) {
                    conx = rules.debugout.partial[j][1]
                    break
                }
            }
        }

        if (typeof tkns[i].value != "object") {
            eend += "\x1b[" + conx + "m" + (
                (rules.debugout.exacpost != undefined && rules.debugout.exacpost[tkns[i].type] != undefined)
                ?rules.debugout.exacpost[tkns[i].type](tkns[i],tkns,rules)
                :tkns[i].value
                ) + "\x1b[0m";
        } else if (rules.debugout.obj != undefined) {
            eend += rules.debugout.obj(tkns[i],tkns,rules) 
        }
    }
    console.log(eend);

    return tkns;
}
function metaparse(lexed, rules) {
    if (rules.parser) {
        for (let i = 0; i < rules.parser.passes.length; i++) {
            lexed = rules.parser.passes[i](lexed,rules)
            
            if (lexed == undefined) {
                throw new Error("parser pass("+i+") returns undefined")
            }
        }
    }
        return lexed
}
function tokenlines(sta, r) {// this function is witchcraft, if it ever breaks, i'm screwed
    let boffer = [{ type: "unsear", value: sta}];

    for (let i = 0; i < r.mat.length; i++) {
        //if match then
        //    recurse
        //    mixlists
        //    break

        if (sta.search(r.mat[i][1]) > -1) {
            let result = sta.search(r.mat[i][1]);
            let front = tokenlines(sta.substring(0, result), r);
            let token = {
                type: r.mat[i][0],
                value: (r.callback && r.callback[r.mat[i][0]]) ? 
                    r.callback[r.mat[i][0]](
                        sta.substring(result, sta.length)
                            .match(r.mat[i][1])[0])
                    : sta.substring(result, sta.length)
                        .match(r.mat[i][1])[0]
            };
            
            let back = tokenlines(
                sta.substring(result, sta.length)
                    .replace(r.mat[i][1], ""), r);

            front.push(token);
            boffer = mixlist(front, back);

            let bofferaswell = [];
            for (let j = 0; j < boffer.length; j++) {
                if (boffer[j].value !== "") { //type coercion biting me in the ass for about an hour here
                    bofferaswell.push(boffer[j]);
                }
            }
            boffer = bofferaswell;

            return boffer;
        }
    }    

    return boffer;
}
function parsemat(mat) {
    let tokenpatterns = []
    if (Array.isArray(mat[1])) {
        for (let i = 0; i < mat[1].length; i++) {
            tokenpatterns.push([mat[0],mat[1][i]])
        }
    } else {
        if (mat[1] instanceof RegExp)
            tokenpatterns.push(mat)
        else {
            for (const prop in mat[1]) {
                if (Array.isArray(mat[1][prop])) {
                    for (let i = 0; i < mat[1][prop].length; i++) {
                        tokenpatterns.push([mat[0]+"."+prop,mat[1][prop][i]])
                    }
                } else {
                    tokenpatterns.push([mat[0]+"."+prop,mat[1][prop]])
                }
            }
        }
    }
    return tokenpatterns
}
function mixlist(a,b) {
    for (let i = 0; i < b.length; i++) {
        a.push(b[i])
    }
    return a
}
function tokenize(pre,rules) { // the sussest function
    let boffer = []
    if (typeof pre != "string") {
        boffer = []
        if (Array.isArray(pre)) {
            pre.forEach(ele => {
                if (ele.type == "unsear") {
                    let tkn = tokenlines(ele.value,rules)
                    tkn.forEach(les => {
                        boffer.push(les)
                    });
                }
                else if (typeof ele == "string") {
                    let tkn = tokenlines(ele,rules)
                    tkn.forEach(les => {
                        boffer.push(les)
                    });
                }
                // if (typeof ele == "string") boffer.push(...tokenlines(ele,rules))
                // else if (ele.type == "unsear") boffer.push(...tokenlines(ele.value,rules))
                else boffer.push(ele)
            });
        }
        // console.log(boffer)
    } else {
        return tokenlines(pre, rules)
    }

    return boffer
}

// function setup() {
//     createCanvas(400, 400);
// }

// function draw() {
//     background(220);
    
//     survi("@cl/#4CAF50/hello/@cl/#673AB7/world",20,20,12)
// }

// function survi(data,x,y,s) {
//     let tks = data.split("/")
//     tks.forEach((x)=>{
//         if (x[0]=="*") {}
//         if (x[0]=="@") {}
//     })
// }

    /*
    
    along the above
    what lay below sneaks
    
    
    //*/
    
//(209) 649-7140
    
    
    
    // :[a-zA-Z_]+((\s|\t)*[a-zA-Z_]+(\s|\t)*(,(\s|\t)*[a-zA-Z_]+)*(\s|\t)*):
    
    
/*

                    for (let i = 1; i < maxdepth+1; i++) {
                        let temp = [] 
                        let records = []
                        let recording = false
                        for (let j = 0; j < tkns.length; j++) {
                            if (tkns[j].depth != i && recording) {
                                recording = false
                                console.log(records)
                                records = []
                            }
                            if (tkns[j].depth == i) {
                                recording = true;
                                records.push(tkns[j])
                            } else {
                                temp.push(tkns[j])
                            }
                        }
                        tkns = temp
                    }
//*/
    
    /*
    
                    for (let i = 1; i < maxdepth+1; i++) {
                        let temp = []
                        let pdepth = 0
                        let records = []
                        let recording = false
                        let s = {
                            line:-1,
                            col:-1
                        }
                        for (let j = 0; j < tkns.length; j++) {
                            if(Math.abs(tkns[j].depth-pdepth)>1) {
                                todo("error: unexpected change in token depth {"+(tkns[j].depth-pdepth)+"}")
                            }
                            let req = false;
                            // start
                            if (tkns[j].depth-pdepth > 0 && tkns[j].depth == i) {
                                recording = true
                                s = tkns[j]
                                // console.log("open: "+tkns[j].type+" : "+(tkns[j].depth))
                                req = true
                            }
                            // end
                            if (tkns[j].depth-pdepth < 0 && tkns[j].depth == i-1) {
                                recording = false
                                // console.log("close: "+tkns[j].type+" : "+(tkns[j].depth+1))
                                let typ = tkns[j].type.split(".")[0]
                                for (let k = 0; k < rule.parser.meta.blocks.length; k++) {
                                    if (rule.parser.meta.blocks[k].type == typ) {
                                        if (rule.parser.meta.blocks[k].parse != undefined) {
                                            records = rule.parser.meta.blocks[k].parse(records, rule)
                                        }
                                    }
                                }
                                temp.push({
                                    type:typ,
                                    value:records, 
                                    line:s.line,
                                    col:s.col
                                })
                                // console.log(records)
                                records = []
                                req = true
                            }
                            //add to req
                            if (!req) {
                                if (recording) {
                                    records.push(tkns[j])
                                } else {
                                    temp.push(tkns[j])
                                }
                            }
                            pdepth = tkns[j].depth
                        }
                        tkns = temp
                    }
                    
    //*/
    

    /*
    

    // console.log(exs,"\x1b[38;2;227;95;113m@\x1b[0m")

    let conx = 30; //Math.round(Math.random()*6+30) //30 - 36
        if (tkns[i].type.startsWith("keyword")) conx = 35;
        if (tkns[i].type.startsWith("type")) conx = 34;
        if (tkns[i].type=="num") conx = 31//Math.round(Math.random()*6+30)//31;
        if (tkns[i].type=="string") conx = 32;
        if (tkns[i].type=="ident") {
            eend += "\x1b[3m"
            // conx = "38;2;227;95;113"
            conx = "38;2;242;176;94"
        }
        if (tkns[i].type.startsWith("op") || tkns[i].type.startsWith("eq")) {
            conx = 33;
        }

        if (typeof tkns[i].value != "object") {
            eend += "\x1b[" + conx + "m" + tkns[i].value + "\x1b[0m";
        } else {
            if (tkns[i].type == "atdoc") {
                eend += "\x1b[31m@(" + tkns[i].value.ident + ") " +
                    tkns[i].value.text + "\x1b[0m ";
            }
        }

        // if (tkns[i].type == "ws.nl")
        //     eend += "   ".repeat(tkns[i].depth)
    //*/
import {lang} from './lang'
import {funcLib} from './func'
import {nextBar, reducer} from './helpers'
import Tone from 'tone'

var ohm = require('ohm-js')
var grammar = ohm.grammar(lang)
var semantics = grammar.createSemantics();

var refName = "";

var codeRef = {}
var unModifiedRefList = []
var modifiedRefList = []

window.funcList = {}
window.tracks = {}
window.playlist = []

var actions = {

    Piece: pieceStackOrBlock => {
        pieceStackOrBlock.run()
    },

    Piece_stack: (piece, _listOfNewLineToken, block) => {
        piece.run()
        block.run()
    },

    Block: block => {
        if (block.ctorName === "Track") { // otherwise it is a comment
            block.run()
        }
    },

    Track: (ref, _colon, chain) => {

        refName = ref.sourceString  // can be "", anonymous
        refName = refName === "" ? "anonymous" : refName

        window.funcList[refName] = []

        if (codeRef[refName] === chain.sourceString) {
            unModifiedRefList.push(refName)
        } else {
            modifiedRefList.push(refName)
        }

        codeRef[refName] = chain.sourceString // an obj to store code
        chain.run()
    },

    Chain: (chainStackOrFunc) => {
        chainStackOrFunc.run();
    },

    Chain_stack: (chain, _doubleGreaterThanToken, func) => {
        chain.run() // another chain_rec
        func.run() // a func
    },

    Func: (name, elem) => {
       
        let funcName = name.sourceString
        let funcElem = elem.sourceString.replace(/,/g, "").split(" ")

        // console.log(funcName, funcElem)
        if (funcName === "") { // the func is only a ref e.g. >> ~func >>
            window.funcList[refName].push(funcElem[0]) // funcElem is sth like "~my_fx"

        } else {
            let func = funcLib[funcName](funcElem) // take a fun from the lib
            window.funcList[refName].push(func)
        }
    }
}

semantics.addOperation('run', actions);

const initGlobalVariables = () => {
    window.funcList = {}
    window.playlist = []
    unModifiedRefList = []
    modifiedRefList = []
}



const run = (code) => {

    console.clear()
    
    Tone.context.latencyHint = "balanced"

    let match = grammar.match(code)

    if (match.succeeded()) {

        // clean global variables right
        initGlobalVariables()
        window.tracks = {}
        codeRef = {}

        Tone.Transport.start()

        // get global variables right
        semantics(match).run()

        // lazy evaluation
        for (let ref in window.funcList) {
            if (unModifiedRefList.indexOf(ref) === -1) {
                try {
                    window.funcList[ref].reduce(reducer, ref)
                } catch(e){
                    console.log(e)
                }
            }
        }

        for (let item in window.tracks) {
            if ("seq" in window.tracks[item]) {
                window.tracks[item].seq.start()
            } else {
                if (window.tracks[item].dur === "hold") {
                    
                    window.tracks[item].env.triggerAttack()
                } else {
                    window.tracks[item].env.triggerAttackRelease(window.tracks[item].dur)
                }
            }
        }

        console.log(
            "window.funcList\n\n",window.funcList,
            "\n\nwindow.playlist\n\n", window.playlist,
            "\n\nwindow.tracks\n\n", window.tracks,
            "\n\nunModifiedRefList\n\n", unModifiedRefList,
            "\n\nmodifiedRefList\n\n", modifiedRefList
        )

        console.log(Tone.context.latencyHint)
    };
}

const update = (code) => {

    console.clear()

    let match = grammar.match(code)

    if (match.succeeded()) {

        let next = nextBar()

        initGlobalVariables()

        // get global variables right
        semantics(match).run()

        
        // 1. user can comment in and out the same thing
        let commentOutList = Object.keys(codeRef).filter(
            // neither in unModifiedRefList nor in modifiedRefList
            item => (unModifiedRefList.concat(modifiedRefList).indexOf(item) === -1) )

        commentOutList.forEach( i => {
            codeRef[i] = "commented out" // this string can be anything
        })

        // 2. recursively use the modifiedRefList to search unmodifiedRefList

        if (unModifiedRefList.length > 0) {

            const relatedToModifiedRefs = ref => {
                let code = codeRef[ref]
                let searchResult = modifiedRefList.filter( serachItem => {
                    return code.search(serachItem) !== -1
                })
                return searchResult.length !== 0
            }

            const has = (arr) => (item) => !arr.includes(item)

            for (let i = 0; i < 500; i++) { // can change to while true
                let findings = unModifiedRefList.filter(relatedToModifiedRefs)
                modifiedRefList.push(...findings)
                unModifiedRefList = unModifiedRefList.filter( has(findings) )

                if (findings.length === 0) {
                    break
                }
            }
        }

        // schedule to stop current playing tracks on the start of next bar 
        for (let item in window.tracks) {
            if ("seq" in window.tracks[item]) {
                console.log("progress", item, window.tracks[item].seq.progress)
            }

            if (unModifiedRefList.indexOf(item) === -1) {
                if ("seq" in window.tracks[item]) {
                    window.tracks[item].seq.stop(next)
                } else {
                    window.tracks[item].env.triggerRelease()
                }
            }
        }

        // create new tracks and playlist
        for (let ref in window.funcList) {
            if (unModifiedRefList.indexOf(ref) === -1) {
                try {
                    window.funcList[ref].reduce(reducer, ref)
                } catch(e){
                    console.log(e)
                }
            }
        }

        // schedule to start new playlist
        window.playlist.forEach( item => {
            if (unModifiedRefList.indexOf(item) === -1) {
                if ("seq" in window.tracks[item]) {
                    window.tracks[item].seq.start(next)
                } else {
                    if (window.tracks[item].dur === "hold") {
                        window.tracks[item].env.triggerAttack()
                    } else {
                        window.tracks[item].env.triggerAttackRelease(window.tracks[item].dur)
                    }
                }
            }
        })

        console.log(
            "window.funcList\n\n",window.funcList,
            "\n\nwindow.playlist\n\n", window.playlist,
            "\n\nwindow.tracks\n\n", window.tracks,
            "\n\nunModifiedRefList\n\n", unModifiedRefList,
            "\n\nmodifiedRefList\n\n", modifiedRefList
        )

    };
}

const stop = () => {
    Tone.context.dispose()
    Tone.context = new AudioContext();
    initGlobalVariables()
    codeRef = {}

}

export default {run, stop, update}
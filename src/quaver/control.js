var Tone = require('tone')

const bpm = paras => {
    try {
        Tone.Transport.bpm.value = parseFloat(paras[0])
    } catch(e) {console.log(e)} 
    return () => {}
}

const noteToTone = (x) => {
    if (x.indexOf("_")===-1) { // x is only MIDI note number
        return parseFloat(x)
        // return Tone.Frequency(parseFloat(x), "midi").toNote()
    } else if (x ==="_") { // x is a rest
        return null
    } else { // x is compound note
        while (x.indexOf("_") !== -1) {
            x = x.replace("_", "@$")
        }
        return x.split("$").filter(x => x !== "").map(
            x => x === "@" ? null: parseFloat(x) )
    }
}

const numToMIDI = (item) => {
    if ( Array.isArray(item) ) {
        item = item.map(numToMIDI)
        return item
    }
    return item === null ? null : Tone.Frequency(item, "midi").toNote()
}

const loop = (notes) => {

    notes = notes.map(noteToTone)

    return (ref) => ({
        n: notes,
        trigger: function (synth) {
            return {
                ref: ref,
                synth: synth,
                effects: [],
                seq: new Tone.Sequence(
                    (time, note) => {
                        if (synth.noise) {
                            synth.triggerAttack(time);
                        } else {
                            // let dur = synth.envelope.attack + synth.envelope.decay
                            synth.triggerAttackRelease(note, "16n", time);
                        }
                    },
                    this.n.map(numToMIDI),
                    Tone.Time('1m') / this.n.length
                )
            }
        }
    })
}

const dub = (notes) => {

    notes = notes.map(noteToTone)

    const add = (arr1, arr2) => {
        arr1.forEach( (item,index) => {
            if (Array.isArray(item)) {
                add(item, arr2[index])
            } else {
                arr1[index] += arr2[index]
            }
        })
    }

    return (triggerObj) => {
        add(triggerObj.n, notes)
        return triggerObj
    }
}

export {bpm, loop, dub}
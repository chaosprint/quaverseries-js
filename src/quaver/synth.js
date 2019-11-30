import {handlePara} from './helpers'
import {sampleList} from './samples'
import Tone from 'tone'

const monoSynth = type => paras => trigger => {
    const sawtooth = new Tone.MonoSynth({
        oscillator: {
            type: type
        },
        envelope: {
            attack : 0.005,
            decay : 0.1,
            sustain : 0.9,
            release : 1
        },
        filter: {
            Q: 1
        }
    })
    // console.log("connector", trigger)
    return trigger.connector(sawtooth)
}

const noiseSynth = type => paras => trigger => {
    const synth = new Tone.NoiseSynth({
        noise: {
            type: type
        }
    })
    return trigger.connector(synth)
}

const membrane = paras => trigger => {
    var synth = new Tone.MembraneSynth()
    return trigger.connector(synth)
}

const pluck = paras => trigger => {
    const pluck = new Tone.PluckSynth({
        attackNoise : handlePara(paras[0], 1),
        dampening : handlePara(paras[1], 4000),
        resonance : handlePara(paras[2], 0.7),
    })
    return trigger.connector(pluck)
}

const metalphone = paras => trigger => {
    var synth = new Tone.MetalSynth({
        frequency: handlePara(paras[0], 200),
        harmonicity : handlePara(paras[1], 5.1),
        modulationIndex : handlePara(paras[2], 32),
        resonance : handlePara(paras[3], 4000),
        octaves : handlePara(paras[4], 1.5)
    })
    return trigger.connector(synth)
}

const fm = paras => trigger => {
    var synth = new Tone.FMSynth({
        harmonicity: handlePara(paras[0], 3),
        modulationIndex : handlePara(paras[1], 10)
    })
    return trigger.connector(synth)
}

const sampler = paras => trigger => {

    try {
        if (paras.length === 2) {
            let name = paras[0].replace("\\", "")
            let index = parseInt(paras[1])
            let limit = sampleList[name].length
            let sampleName = index > (limit - 1) ? sampleList[name][limit-1] : sampleList[name][index]

            const synth = new Tone.Sampler({
                "C4": name+'/'+sampleName 
            }, function(){
                //sampler will repitch the closest sample
                // sampler.triggerAttack("D3")
            }, 'https://raw.githubusercontent.com/chaosprint/Dirt-Samples/master/')
            return trigger.connector(synth)
        }
    } catch (error) {
        console.log(error)
    }
    
    // if (paras.length === 2) {
    //     try {
    //         let name = paras[0]
    //         let number = parseInt(paras[1])
    //         let sampleName = sampleList[name][number]
    //         // let obj = {}
    //         let obj = 'https://raw.githubusercontent.com/tidalcycles/Dirt-Samples/master/'+name+'/'+sampleName 
    //         // obj["C2"] = 'https://raw.githubusercontent.com/Tonejs/Tone.js/dev/examples/audio/casio/C2.mp3'

    //         const synth = new Tone.Player(obj, () => {
    //             console.log("loaded")
    //         })
    //         console.log(synth)
    //         return trigger.connector(synth)

    //     } catch(e) {console.log(e)}
    // }
}

export {noiseSynth, monoSynth, membrane, pluck,
    metalphone, fm, sampler}
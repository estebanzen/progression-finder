import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SOUNDFONTS = {
  'piano': 'https://gleitz.github.io/midi-js-soundfonts/FluidR3_GM/acoustic_grand_piano-mp3.js',
  'rhodes': 'https://gleitz.github.io/midi-js-soundfonts/FluidR3_GM/electric_piano_1-mp3.js',
  'wurlitzer': 'https://gleitz.github.io/midi-js-soundfonts/FluidR3_GM/electric_piano_2-mp3.js',
  'clavinet': 'https://gleitz.github.io/midi-js-soundfonts/FluidR3_GM/clavinet-mp3.js',
  'nylon-guitar': 'https://gleitz.github.io/midi-js-soundfonts/FluidR3_GM/acoustic_guitar_nylon-mp3.js',
  'jazz-guitar': 'https://gleitz.github.io/midi-js-soundfonts/FluidR3_GM/electric_guitar_jazz-mp3.js'
};

const NOTES_TO_KEEP = ['C2', 'C3', 'C4', 'C5', 'C6'];

// MIDI.js notes use sharp symbols (e.g. C#4) but the URL keys might be 'C2' or 'C3'. 
// We will look for keys that map to our desired notes.
// In MIDI.js soundfont files, the keys are note names like "C2", "C3", "Db4" etc.
// But some might be flat/sharp differently. We just extract our specific NOTES_TO_KEEP.
// Soundfonts are JS files that do: 
// if (typeof(MIDI) === "undefined") var MIDI = {};
// if (typeof(MIDI.Soundfont) === "undefined") MIDI.Soundfont = {};
// MIDI.Soundfont.instrument_name = { "C2": "data:audio/mp3;base64,...", ... };

async function extractSoundfonts() {
  const publicSamplesDir = path.join(__dirname, '../public/samples');
  
  if (!fs.existsSync(publicSamplesDir)) {
    fs.mkdirSync(publicSamplesDir, { recursive: true });
  }

  for (const [instrument, url] of Object.entries(SOUNDFONTS)) {
    console.log(`\nProcessing ${instrument}...`);
    const instrumentDir = path.join(publicSamplesDir, instrument);
    
    if (!fs.existsSync(instrumentDir)) {
      fs.mkdirSync(instrumentDir, { recursive: true });
    }

    try {
      console.log(`Downloading ${url}...`);
      const response = await fetch(url);
      if (!response.ok) throw new Error(`Failed to fetch: ${response.statusText}`);
      
      const text = await response.text();
      
      // The file contains a JSON-like object with base64 strings
      // We can extract them using regex for the notes we care about.
      for (const note of NOTES_TO_KEEP) {
        // The notes might be like "C2": "data:audio/mp3;base64,//O0X..."
        const regex = new RegExp(`"${note}"\\s*:\\s*"data:audio/[^;]+;base64,([^"]+)"`);
        const match = text.match(regex);
        
        if (match && match[1]) {
          const base64Data = match[1];
          const buffer = Buffer.from(base64Data, 'base64');
          const filePath = path.join(instrumentDir, `${note}.mp3`);
          
          fs.writeFileSync(filePath, buffer);
          console.log(`  Saved ${note}.mp3`);
        } else {
          console.warn(`  Warning: Note ${note} not found in ${instrument} soundfont.`);
        }
      }
    } catch (err) {
      console.error(`Error processing ${instrument}:`, err);
    }
  }
  
  console.log('\nExtraction complete!');
}

extractSoundfonts();

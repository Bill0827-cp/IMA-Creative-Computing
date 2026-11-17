import {test} from 'node:test';
import assert from 'node:assert/strict';
import {inferMood,imageURL} from '../dist/mood.js';
test('recognizes feelings while respecting simple negation and mixed moods',()=>{assert.equal(inferMood('I am happy and excited'),'joy');assert.equal(inferMood('I am not happy'),'sad');assert.equal(inferMood('I was sad but now happy'),'mixed');assert.equal(inferMood('I had breakfast'),'mixed');assert.equal(inferMood('exhausted and stressed'),'tired');});
test('accepts model image formats and rejects unsafe or incomplete outputs',()=>{assert.equal(imageURL({output:['https://replicate.delivery/a.png']}),'https://replicate.delivery/a.png');assert.equal(imageURL({output:'https://replicate.delivery/b.png'}),'https://replicate.delivery/b.png');assert.equal(imageURL({status:'processing'}),null);assert.equal(imageURL({output:'javascript:alert(1)'}),null);assert.equal(imageURL({output:{url:'x'}}),null);});

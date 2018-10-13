
//var fs = require('fs');
//var scene = JSON.parse(fs.readFileSync('c:\\users\\adam\\desktop\\scenes\\plane-with-texture', {encoding:'utf-8'}));

// to add textures: first, there's the question of where to put the image cache.  it probably should be here in scene.js rather than in model.js, because i feel this is a thing that will be changed frequently.  model.js should be more static

// then there's the question of where to put the Material objects.  because the geometry functions link to the material objects via a named reference, the material object names must be visible to the geometry functions.  for this reason, it makes sense to keep the materials in model.js.  (this is not a problem with the images, because the materials link to the images with strings, not names.  this allows us to dissociate them in the code and only link them when we have to.  of course, we could also have the geometry functions link to the materials with strings rather than names

// an additional layer of complication here is the desire to not totally break export to duf.  for example, the images would work better as a dict, indexed by id, since we have to look up the images at some point.  but that would break the export code.  at some point we will have to start with a working export example and slowly refactor the code, maintaining correct export functionality


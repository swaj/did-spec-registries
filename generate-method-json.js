const {decode} = require('html-entities');
const fs = require('fs');
const mkdirp = require('mkdirp');
const path = require('path');
const util = require('util');
const exec = util.promisify(require('child_process').exec);

// set directories and paths
const registryFile = path.join('index.html');
const methodsDir = path.join('methods');

// create directories
mkdirp.sync(methodsDir);

// analyze DID Methods in index.html and write out individual files
(async () => {
  // search every DID Method
  const registryHtml = fs.readFileSync(registryFile, 'utf-8');
  const didMethodRegex = /<tr>\n.*<td>\n\s+did:(.*):\n.*<\/td>\n.*<td>\s+(.*)\n.*<\/td>\n.*<td>\s+(.*)\n.*<\/td>\n.*<td>\n\s+(.*)\n.*<\/td>\n.*<td>\n\s+(.*)\n.*/g;
  const didSpecRegex = /<a href="(.*)">.*<\/a>/;
  const allDidMethods =
    [...registryHtml.matchAll(didMethodRegex)];
  for(const method of allDidMethods) {
    const name = method[1];
    let status = method[2];
    let verifiableDataRegistry = method[3];
    const contact = method[4];
    let contactName = '';
    let contactEmail = '';
    let contactWebsite = '';
    let specification = method[5].match(didSpecRegex);
    if(specification === null) {
      specification = '';
    } else {
      specification = specification[1];
    }
    if(status === 'PROVISIONAL') {
      status = 'registered';
    } else if(status === 'WITHDRAWN') {
      status = 'withdrawn';
    } else if(status === 'DEPRECATED') {
      status = 'deprecated';
    }
    if(contact) {
      let match = contact.match(/<a .*>([^<]+)<\/a>/);
      contactName = (match) ? match[1] : '';
      match = contact.match(/<a href="mailto:([^"]+)">.*<\/a>/);
      contactEmail = (match) ? match[1] : '';
      match = contact.match(/<a href="(http[^"]+)">.*<\/a>/);
      contactWebsite = (match) ? match[1] : '';
      if(contactName === '' && contactEmail === '' && contactWebsite === '') {
        contactName = contact;
      }
    }
    if(verifiableDataRegistry) {
      verifiableDataRegistry = verifiableDataRegistry.replace(
        'Ledger independent', 'Ledger-independent');
    }
    const entry = {
      name, status, verifiableDataRegistry, contactName, contactEmail,
      contactWebsite, specification
    };

    // write entry to disk
    const methodFile = path.join(methodsDir, name + '.json');
    fs.writeFileSync(methodFile, JSON.stringify(entry, null, 2));

    // add and commit entry
    const {stdout1, stderr1} = await exec('git add ' + methodFile);
    if(stderr1) { throw new Error(stderr); }
    const {stdout2, stderr2} = await exec(`git commit -m "Convert did:${name} to JSON entry." ${methodFile}`);
    if(stderr2) { throw new Error(stderr); }

    console.log(entry);
  }
})();

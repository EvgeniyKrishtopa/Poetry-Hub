## ADDED Requirements

### Requirement: Stored images are re-encoded (pre-deploy-security-hardening FR-10)
Every author photo and poem illustration the app stores SHALL be re-encoded on the server first: EXIF orientation applied, then no EXIF or other embedded metadata, no bytes after the image, PNG kept PNG and JPEG kept JPEG. A file that cannot be decoded or exceeds 50 million pixels SHALL be refused with the existing invalid-file failure, and a result above the bucket's size limit with the existing too-large failure; nothing is stored then.

#### Scenario: JPEG with GPS
- **GIVEN** a JPEG with GPS EXIF
- **WHEN** an author uploads it as a photo or an illustration
- **THEN** the stored object has no EXIF

#### Scenario: Rotated photo
- **GIVEN** a JPEG whose EXIF orientation says it is rotated
- **WHEN** it is uploaded
- **THEN** the stored pixels are upright and no orientation tag remains

#### Scenario: Trailing payload
- **GIVEN** a PNG with extra bytes after its end
- **WHEN** it is uploaded
- **THEN** the stored PNG does not contain them

#### Scenario: Broken file
- **GIVEN** a file with a PNG signature and no decodable image
- **WHEN** it is uploaded
- **THEN** the invalid-file failure shows and Storage holds nothing new

### Requirement: Bounded objects per author folder (pre-deploy-security-hardening FR-11)
The database SHALL refuse an upload into an author's folder that would exceed the cap: 5 objects in `author-photos`; in `poem-illustrations`, the author's poem count plus 20. The cap SHALL apply to direct Storage API calls; under parallel uploads it holds as strictly as design D8's check shows Storage allows. The cap check SHALL answer nothing about another author's folder. The app's normal create, edit and replace flows SHALL stay within it.

#### Scenario: Direct upload past the cap
- **GIVEN** an author photo folder holding 5 objects
- **WHEN** its owner uploads another with the Storage API
- **THEN** the upload is refused

#### Scenario: Another author's folder
- **GIVEN** a signed-in user
- **WHEN** they call the cap check for another author's folder
- **THEN** it answers false whatever that folder holds

#### Scenario: Below the cap
- **GIVEN** a folder with one photo
- **WHEN** the owner replaces it in the app
- **THEN** the replacement succeeds

#### Scenario: Refusal in the app
- **GIVEN** a folder at its cap
- **WHEN** the owner uploads through the app
- **THEN** the existing save failure shows and the profile or poem is unchanged

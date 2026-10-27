## MODIFIED Requirements

### Requirement: Brief caching of failed public reads (NFR-7)
A cached public read (the directory list, or one author) SHALL keep an unavailable result for seconds, a not-found result for minutes, and a successful result for hours, so a transient failure heals without a deploy or an edit. With no cache entry, the page SHALL show its loading state until the read finishes, and concurrent requests for the same read on one server instance SHALL share one read (add-author-poems FR-14). An unavailable result SHALL never be frozen into a prerendered page: a build with no database SHALL exit 0 and the page SHALL render the failure at request time.

#### Scenario: Unavailable heals
- **GIVEN** `/authors` rendered "Список авторов сейчас недоступен." because the database was down
- **WHEN** the database is back and the page is requested again a little over one second later (the `"seconds"` profile's revalidate time, with Next's default cache)
- **THEN** it lists the public authors without any edit or deploy

#### Scenario: Loading state and one shared read
- **GIVEN** no cache entry for an author, and the server's read from Supabase is slow (delayed on the server → Supabase hop, not in the browser)
- **WHEN** two requests for `/authors/<id>` arrive at the same time
- **THEN** both show the author page's skeleton until the content arrives
- **AND** the database is read once for both

#### Scenario: Build without a database
- **GIVEN** no Supabase environment variables are set
- **WHEN** `npm run build` runs
- **THEN** it exits 0, and `/authors` is not prerendered with the unavailable message: the list renders at request time

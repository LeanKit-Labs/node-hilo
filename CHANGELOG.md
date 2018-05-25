## 1.0.0

### 1.1.0

* Added nextIds and swapped preparedSql for query.
* Updated machina
* Updated lodash
* Updated dev dependencies.
* Replaced when with native promises.
* Replaced gulp, jshint, and jscs with npm scripts and eslint.
* Made the hilo table name configurable.
* Updated to biggulp 0.2.0

### 0.1.2

Use exponentially increasing retry delay on DB error, up to a limit instead of a permanent error mode after the first failure to retrieve a new id.

### 0.1.1

Defer acquisition of hi value until an id is requested.

### 0.1.0

Initial release.

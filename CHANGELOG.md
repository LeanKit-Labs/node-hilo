## 5.x

### 5.0.0

* 5.0.0-multiSubnetFailover.0
* Default multiSubnetFailover to true.

## 4.x

### 4.0.0

* Goodbye lodash. 👋
* Update tedious
* Remove processhost
* Update deps
* Update to latest node version

## 3.x

### 3.0.1

* Updated dev dependencies

### 3.0.0

* Bumped to node 16, updated deps, added type definition

## 2.x

### 2.0.0

* Removed dependency on seriate. Now uses tedious directly.

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

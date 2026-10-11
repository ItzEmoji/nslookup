# Changelog

## 1.0.0 (2026-10-11)


### ⚠ BREAKING CHANGES

* **api:** GET /history/{domain} is gone. Query SecurityTrails directly for historical DNS records.
* **api:** the /security response changed. `spf` is now an array of records, `dmarc` is an object { record, policy, subdomainPolicy } or null, `dkim` is a map of selector to key (null unless ?dkim= is given), and `hasCAA` is replaced by the `caa` array.
* **api:** GET /proxy-dns is gone. Query DoH resolvers directly, or use ?resolvers= on the lookup endpoints.

### Features

* **api:** publish an OpenAPI 3.1 description at /openapi.json ([25762d1](https://github.com/ItzEmoji/nslookup/commit/25762d1b473782a67eabff17ebc4c64134bc55b9))
* **api:** remove the SecurityTrails history lookup ([305d8c2](https://github.com/ItzEmoji/nslookup/commit/305d8c2060b3f9f33e924c97b6d2b1b453d25082))
* **api:** report SPF, DMARC, DKIM and CAA records that can be acted on ([90c9952](https://github.com/ItzEmoji/nslookup/commit/90c9952ee600ffbde02062bd81442d0c1d42f057))


### Bug Fixes

* **api:** ignore formatting differences when comparing resolver answers ([ba18fd3](https://github.com/ItzEmoji/nslookup/commit/ba18fd370feeb8236467fff5f26399d6a7e96747))
* **api:** remove the /proxy-dns open proxy ([c26dbdf](https://github.com/ItzEmoji/nslookup/commit/c26dbdf6637aedb4fd689c1a2870aefd41f2a27c))
* **api:** serve /openapi.json compact unless ?preview is given ([137b592](https://github.com/ItzEmoji/nslookup/commit/137b5924cfeb8b39165e3a03512602a89e5eee80))
* **api:** serve the API to every client that isn't a browser page ([a8b275b](https://github.com/ItzEmoji/nslookup/commit/a8b275b55418887e49d281b06d229f8e837e5397))
* **api:** show the real origin in usage messages ([cc58c66](https://github.com/ItzEmoji/nslookup/commit/cc58c66f54435df120d442ce0883ea938ad463d1))
* **app:** escape untrusted data before rendering it as HTML ([dc002ec](https://github.com/ItzEmoji/nslookup/commit/dc002ec785475ca580f5ec8f55a5131b1389bebc))
* **app:** show whether resolvers actually agree ([25fd9dd](https://github.com/ItzEmoji/nslookup/commit/25fd9ddc0abd0682c20e18c2eb69960e59502442))


### Continuous Integration

* add checks and a release-please pipeline ([70ab9f7](https://github.com/ItzEmoji/nslookup/commit/70ab9f78b7a8befe398ab889bbab2b7ff904a68d))

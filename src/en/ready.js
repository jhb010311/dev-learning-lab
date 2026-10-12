// Labs that are released in the English edition. A translated lab is added here only after it has passed
// tools/i18n/check_en.js and has been looked at in the browser. Labs whose files exist but are not listed
// here are left out of docs/en/index.html (they still appear in previews made with tools/preview.js).
module.exports = [
  // pilot
  'eq', 'stack', 'journey',
  // Java
  'vars', 'casting', 'loops', 'array', 'ctor', 'static', 'inherit', 'poly', 'absint', 'access', 'inner', 'immut',
  'strategy', 'eqhash', 'strbuild', 'datetime', 'optional', 'exflow', 'chkex', 'generic',
  'setmap', 'sqh', 'cme', 'sorting', 'enumtype', 'annot', 'list', 'hashmap',
  'lambda', 'stream', 'collect', 'parstream', 'process', 'thread', 'race', 'deadlock', 'threadpool', 'ctx', 'parallel', 'blocking',
  'gc', 'jit', 'classload', 'iobuf', 'serial',
  // Spring
  'ioc', 'di', 'singleton', 'scope', 'mvc', 'binding', 'validation', 'msgconv',
  'txprop', 'jdbctmpl', 'connpool', 'servlet', 'lifecycle', 'proxy', 'aop', 'tx',
  'autoconf', 'config', 'actuator', 'testing', 'restclient', 'cacheabs', 'security',
  // JPA
  'ormwhy', 'pc', 'entitylife', 'merge', 'mapping', 'embedded', 'owner', 'relations',
  'inheritmap', 'cascade', 'lazyproxy', 'nplus1',
  'index', 'compidx', 'explainplan', 'joinalgo',
  'normal', 'selectorder', 'join', 'subquery',
  'iso', 'gaplock', 'dbdeadlock', 'undoredo',
  'windowfn', 'paging', 'viewproc', 'btree',
  'fetchjoin', 'bulk', 'datajpa', 'dynquery',
  'bufferpool', 'replica', 'shard', 'partition', 'redis', 'nosql',
  'stock', 'dtoquery', 'constraints', 'ermodel',
  'httpmsg', 'httpver', 'cookie', 'etag',
  'layers', 'dns', 'routing', 'socket', 'idem', 'redirect', 'conneg', 'scale', 'revproxy', 'cdn', 'pwhash', 'sessionfix', 
  'url',
  'cors', 'realtime', 'tls', 'oauth', 'accessctl',
  'tcp', 'subnet', 'udp', 'congestion',
  'auth', 'jwt', 'methodsec', 'webattack',
  'k8s', 'pct', 'trace', 'git',
  'cache', 'mq', 'kafka', 'circuit', 'saga',
  'gateway', 'cicd', 'deploy', 'container',
  'clickjack', 'infoleak', 'ratelimit', 'supplychain', 'crypto',
  'var_basic', 'method_basic', 'class_basic', 'ref_basic', 'ctor_basic', 'static_basic', 'inherit_basic', 'interface_basic', 'exception_basic', 'generic_basic', 'lambda_basic', 'annot_basic', 'thread_basic', 'bean_basic', 'di_basic', 'servlet_basic', 'controller_basic', 'tx_basic', 'boot_basic', 'entity_basic', 'pc_basic', 'repo_basic', 'relation_basic', 'table_basic', 'pk_basic', 'fk_basic', 'where_basic', 'join_basic', 'index_basic', 'dbtx_basic', 'port_basic', 'url_basic', 'dns_basic', 'http_basic', 'httpres_basic', 'cookie_basic',
  'json_basic', 'https_basic', 'authn_basic', 'session_basic', 'token_basic', 'hash_basic', 'crypto_basic',
];

'use strict';

/**
*
* options = {
*  storeName : 'your store name',
*  keyPath : 'inline key',
*  indexes : [{ name : 'indexName', unique : 'true/false' },{},...]
* }
*
* ------ OR -------
*
* options = [{
*  storeName : 'your store name',
*  keyPath : 'inline key',
*  indexes : [{ name : 'indexName', unique : 'true/false' },{},...]
* }, {
*  storeName : 'your second store name',
*  keyPath : 'inline key',
*  indexes : [{ name : 'indexName', unique : 'true/false' },{},...]
* }]
*
*/

function IDB(dbName,version,options,success,failure){
    this.dbName = dbName;
    this.version = version;
    this.db = null;
    this.objectStore = null;
    this.options = {};
    if (options instanceof Array){
        for (var i = 0;i<options.length; i++){
            this.options[options[i].storeName] = options[i];
        }
    } else {
        this.options[options.storeName] = options;
    }
    console.log('options',this.options);

    var request;
    if (!!this.version)
        request = indexedDB.open(this.dbName,this.version);
    else
        request = indexedDB.open(this.dbName);

    request.onerror = function(event){
        console.log('failed to open db ' + event);
        failure();
    };
    request.onupgradeneeded = function(event){
        var db = event.target.result;
        this.db = db;
        var opKeys = Object.keys(this.options);
        for (var i=0; i < opKeys.length; i++){
            var options = this.options[opKeys[i]];
            var objectStore;

            if(!this.db.objectStoreNames.contains(options.storeName)){
                if (!!options.keyPath)
                    objectStore = db.createObjectStore(options.storeName, {keyPath: options.keyPath});
                else
                    objectStore = db.createObjectStore(options.storeName);
            } else {
                objectStore = event.currentTarget.transaction.objectStore(options.storeName);
            }
            if (!!options.indexes){
                for (var j=0;j<options.indexes.length;j++){
                    var indexName = options.indexes[j].name;
                    var indexData = options.indexes[j];

                    if(objectStore.indexNames.contains(indexName)){
                        // check if it complies
                        var actualIndex = objectStore.index(indexName);
                        var complies = indexComplies(actualIndex, indexData);
                        if(!complies){
                            objectStore.deleteIndex(indexName);
                            objectStore.createIndex(indexName, indexName, { unique: indexData.unique });
                        }
                    } else {
                        objectStore.createIndex(indexName, indexName, { unique: indexData.unique });
                    }
                }
            }
        }
        success(event.target.transaction);
    }.bind(this);
    request.onsuccess = function(event){
        this.db = event.target.result;
        success();
    }.bind(this);
}

// https://github.com/jensarps/IDBWrapper/blob/master/idbstore.js
function indexComplies(actual, expected) {
    var complies = ['keyPath', 'unique', 'multiEntry'].every(function (key) {
        // IE10 returns undefined for no multiEntry
            if (key == 'multiEntry' && actual[key] === undefined && expected[key] === false) {
                return true;
            }
            return expected[key] == actual[key];
    });
    return complies;
};

IDB.prototype.getTransactionStore = function(storeName,mode){
    if (!(this.db instanceof IDBDatabase))
        throw 'missing database error!';

    if (typeof mode !== 'string')
        return this.db.transaction(storeName).objectStore(storeName);
    else
        return this.db.transaction(storeName,mode).objectStore(storeName);
}

IDB.prototype.getItemOnIndex = function(storeName, index, key, success, failure){
    var boundKeyRange = IDBKeyRange.only(key);

    var cursorRequest = this.getTransactionStore(storeName)
    .index(index).openCursor(boundKeyRange);

    cursorRequest.onsuccess = function(event) {
        var cursor = cursorRequest.result || event.result;
        if (cursor) {
            success(cursor.value);
        }
        else {
            console.log('no cursor');
        }
    };
    cursorRequest.onerror = failure;
}

IDB.prototype.getItem = function(storeName, key, success, failure){
    var getRequest = this.getTransactionStore(storeName).get(key);

    getRequest.onsuccess = function(event) {
        success(event.target.result);
    };
    getRequest.onerror = failure;
}

IDB.prototype.getInit = function(transaction, storeName, success, failure){
    var objectStore = transaction.objectStore(storeName);
    var results = [];

    objectStore.openCursor().onsuccess = function(event) {
        var cursor = event.target.result;
        if (cursor) {
            results.push(cursor.value);
            cursor.continue();
        }
        else {
            success(results);
        }
    };
    objectStore.onerror = failure;
}

IDB.prototype.getAll = function(storeName, success, failure){
    var objectStore = this.getTransactionStore(storeName); 
    var results = [];

    objectStore.openCursor().onsuccess = function(event) {
        var cursor = event.target.result;
        if (cursor) {
            results.push(cursor.value);
            cursor.continue();
        }
        else {
            success(results);
        }
    };
    objectStore.onerror = failure;
}

IDB.prototype.remove = function(storeName, key, success, failure){
    var request = this.getTransactionStore(storeName, "readwrite").delete(key);
    request.onsuccess = function(event){ success(); };
    request.onerror = failure;
}

IDB.prototype.put = function(storeName, data, success, failure){
    var request = this.getTransactionStore(storeName, "readwrite").put(data);
    request.onsuccess = function(event){ success(); };
    request.onerror = failure;
}

// data should be an array of objects to be inserted
IDB.batchInsert = function(options, data, success, failure) {
    var onsuccess = function(db){
        console.log('db',db);
        var objectStore = db.transaction(options.storeName,"readwrite")
        .objectStore(options.storeName);

        putNext();
        var i=0;

        function putNext() {
            if (i<data.length) {
                objectStore.put(data[i]).onsuccess = putNext;
                ++i;
            } else {
                console.log('populate complete');
                success();
            }
        }

    }
    var onerror = failure;
    IDB.init(options,onsuccess,onerror);
}




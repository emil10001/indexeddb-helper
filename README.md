## About

This is a wrapper library for IndexedDB. It's very basic, definitely not production ready. This is really intended to be a learning exercise to learn the basics of IndexedDB. Also, IndexedDB seems to be a fairly verbose API, so I wanted to have a wrapper that would abstract out some of the redundant parts for me.

## Dependencies

[EventEmitter](https://github.com/Wolfy87/EventEmitter) is used instead of callbacks to communicate between IDB and the client.

## Example Usage
    
    // example options

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
    
    var options = {
        storeName : 'todos',
        keyPath : 'timeStamp',
        indexes : [{name : 'text', unique : false}]
    };
    
    // these are callback functions that are triggered by the EventEmitter
    
    var getInit = function(dbname, transaction){
        if (dbname !== myDbName)
            return;
    
        if (transaction instanceof IDBTransaction)
            idb.getInit(transaction, options.storeName);
        else
            idb.getAll(options.storeName);
    };
    
    var printItem = function(dbname, data){
        if (dbname !== myDbName)
            return;
    
        console.log('printItem ', data);
    };
    
    // below are mthods that actually call the IDB instance
    
    var getAll = function(dbname){
        if (dbname !== myDbName)
            return;
    
        console.log('getAll');
        idb.getAll(options.storeName);
    };
    
    var getItem = function(key){
        console.log('getItem ',key);
        // if you're getting an item with a key
        idb.getItem(options.storeName, parseInt(key));
        // if you're getting an item with an index
        idb.getItemOnIndex(options.storeName, options.indexes[0].name, key);
    }
    
    var deleteItem = function(item){
        idb.remove(options.storeName, item.timeStamp);
    }
    
    var addItem = function(item){
        idb.put(options.storeName, {'timeStamp': new Date().getTime(), 'text' : item}); 
    };
    
    var failure = function(){console.log('failure');};
    
    var myDbName = 'idb-todos';
    
    IDB.events.addListener('failure',failure);
    IDB.events.addListener('dbopenupgrade',getInit);
    IDB.events.addListener('dbopen',getInit);
    IDB.events.addListener('getitemonindex',printItem);
    IDB.events.addListener('getinit',printItem);
    IDB.events.addListener('getall',printItem);
    IDB.events.addListener('getitem',printItem);
    IDB.events.addListener('remove',getAll);
    IDB.events.addListener('put',getAll);
    IDB.events.addListener('batchinsert',getAll);
    
    var idb = new IDB(myDbName,1,options);

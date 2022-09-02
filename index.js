#!/usr/bin/env node
const converter = require('openapi-to-postmanv2')
const collection = require('./lib/collection')
process.env.SUPPRESS_NO_CONFIG_WARNING = 'y';
var configModule = require('config')
config = configModule.util.loadFileConfigs(__dirname + '/config/')
const fetch = require('./lib/fetch')
const merger=require('./lib/merger')

const program = require('commander')
program.version('1.0.0')
    .option('-s --service <service>', 'which service to convert')
    .option('-r --replace [repliaces]', 'comma split api name which will replace not merge')
    .parse(process.argv)


var serviceConfig = config[program.service]
var url = serviceConfig.url
var collectionName = serviceConfig.collection_name
var collectionId = serviceConfig.collection_id

//run update
update().catch(err => {
    console.error("run failed," + err)
})

//get swagger json
function getSwaggerJson(url) {
    return fetch({
        url: url,
        methods: 'get'
    }).then(response => {
        return response.data
    })
}



async function update() {
    var swaggerJson = await getSwaggerJson(url)
    //add postman collection used info
    // swaggerJson['info'] = {
    //     'title': collectionName,
    //     'description': collectionName + ' api',
    //     'version': '1.0.0',
    //     '_postman_id': '807bb824-b333-4b59-a6ef-a8d46d3b95bf'
    // }
    var converterInputData = {
        'type': 'string',
        'data': swaggerJson
    }

    //use postman tool convert to postman collection
    converter.convert(converterInputData, { 'folderStrategy': 'Tags' }, async (_a, res) => {
        if (res.result === false) {
            console.log('convert failed')
            console.log(res.reason)
            return
        }
        var convertedJson = res.output[0].data

        var savedCollection = await collection.getCollectionDetail(collectionId)

        if (savedCollection === null) {
            return
        }
        var collectionJson = {
            'collection': {
                'info': {
                    'name': collectionName,
                    'description': collectionName + ' api',
                    '_postman_id': collectionId,
                    "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"

                },
                "item": convertedJson.item
            }
        }

        var mergedCollection=merger.merge(savedCollection,collectionJson)    
        collection.updateCollection(collectionId, mergedCollection)
    })
}

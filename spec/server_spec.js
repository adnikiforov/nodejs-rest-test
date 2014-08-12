var frisby = require('frisby');

var testData = {
    client_id: '123456',
    api_key: '0dbad3c93acf3cbb67e89cd74cc02e6a0328b10e',
    wrong_api_key: '71fa842edd0f157cc58ed752246a58df6e38b968',
    keys: {
        key: 'key',
        value: 'value',
        new_value: 'new_value',
        wrong_key: 'wrong_key'
    }
};

frisby.globalSetup({
    request: {
        inspectOnFailure: true
    }
});

frisby.create('Try auth by api key')
    .post('http://localhost:8088/auth/get_token', {
        client_id: testData.client_id,
        api_key: testData.api_key
    })
    .expectStatus(200)
    .expectHeader('content-type', 'text/plain')
    .expectJSON({
        status: 'OK',
        token: function (e) {
            expect(e).toMatch(/^.{16}$/)
        }
    })
    .afterJSON(function (res) {
        frisby.create('Try invalidate token')
            .delete('http://localhost:8088/auth/release_token/' + res.token)
            .expectStatus(200)
            .expectHeader('content-type', 'text/plain')
            .expectJSON({
                status: 'OK'
            }).afterJSON(function () {
                frisby.create('Check invalidated token')
                    .delete('http://localhost:8088/auth/release_token/' + res.token)
                    .expectStatus(200)
                    .expectHeader('content-type', 'text/plain')
                    .expectJSON({
                        status: 'Error',
                        reason: 'Invalid token'
                    })
                    .toss();
            })
            .toss();
    })
    .toss();

frisby.create('Autorization failure scenario')
    .post('http://localhost:8088/auth/get_token', {
        client_id: testData.client_id,
        api_key: testData.wrong_api_key
    })
    .expectStatus(200)
    .expectHeader('content-type', 'text/plain')
    .expectJSON({
        status: 'Error',
        reason: 'Api key or client ID incorrect'
    })
    .toss();

frisby.create('Preauth')
    .post('http://localhost:8088/auth/get_token', {
        client_id: testData.client_id,
        api_key: testData.api_key
    })
    .expectStatus(200)
    .expectHeader('content-type', 'text/plain')
    .expectJSON({
        status: 'OK',
        token: function (e) {
            expect(e).toMatch(/^.{16}$/)
        }
    })
    .afterJSON(function (res) {
        frisby.create('Create value')
            .post('http://localhost:8088/keys/new', {
                key: testData.keys.key,
                value: testData.keys.value,
                token: res.token
            })
            .expectStatus(200)
            .expectHeader('content-type', 'text/plain')
            .expectJSON({
                status: 'OK'
            })
            .toss();
        frisby.create('Read value')
            .get('http://localhost:8088/keys/show/' + testData.keys.key + '/?token=' + res.token)
            .expectStatus(200)
            .expectHeader('content-type', 'text/plain')
            .expectJSON({
                status: 'OK',
                value: testData.keys.value
            })
            .toss();
        frisby.create('Update value')
            .put('http://localhost:8088/keys/update/' + testData.keys.key, {
                value: testData.keys.new_value,
                token: res.token
            })
            .expectStatus(200)
            .expectHeader('content-type', 'text/plain')
            .expectJSON({
                status: 'OK'
            })
            .toss();
        frisby.create('Delete value')
            .delete('http://localhost:8088/keys/delete/' + testData.keys.key + '/?token=' + res.token)
            .expectStatus(200)
            .expectHeader('content-type', 'text/plain')
            .expectJSON({
                status: 'OK'
            })
            .afterJSON(function () {
                frisby.create('Read deleted value')
                    .get('http://localhost:8088/keys/show/' + testData.keys.key + '/?token=' + res.token)
                    .expectStatus(200)
                    .expectHeader('content-type', 'text/plain')
                    .expectJSON({
                        status: 'Error',
                        reason: 'Key not found'
                    })
                    .toss();
            })
            .toss();
    })
    .toss();
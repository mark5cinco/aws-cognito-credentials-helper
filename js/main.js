(function ($) {

    let IDENTITY_POOL_ID;
    let USER_POOL_ID;
    let CLIENT_ID;
    let USER;
    let PASSWORD;
    let NEW_PASSWORD;

    function generateUnAuthenticated() {
        IDENTITY_POOL_ID = $('#unauth-ipid').val();

        AWS.config.region = 'ap-northeast-1';
        AWS.config.credentials = new AWS.CognitoIdentityCredentials({
            IdentityPoolId: IDENTITY_POOL_ID
        });

        const sts = new AWS.STS({});

        $('[id^=guest-btn]').attr('disabled', true);

        sts.getCallerIdentity().promise()
            .then(data => {
                console.log('UserLoginService: Successfully set the AWS credentials');

                $('#guest-btn-access-key').attr('data-clipboard-text', AWS.config.credentials.accessKeyId);
                $('#guest-btn-secret-key').attr('data-clipboard-text', AWS.config.credentials.secretAccessKey);
                $('#guest-btn-session-token').attr('data-clipboard-text', AWS.config.credentials.sessionToken);
                $('#guest-btn-identity-id').attr('data-clipboard-text', AWS.config.credentials.params.IdentityId);

                $('[id^=guest-btn]').attr('disabled', false);

                // $.ajax({
                //     url: 'https://odm7l70dz6.execute-api.ap-northeast-1.amazonaws.com/api/dashboard',
                //     headers: {
                //         "X-Amz-Date": "20171219T052628Z",
                //         "Authorization": "",
                //         "X-Amz-Security-Token": "",
                //         "Content-Type": "application/json"
                //     },
                //     success: function (response) {
                //         console.log(response);
                //     },
                //     error: function () {
                //         console.log('Bummer: there was an error!')
                //     },
                // });
            })
            .catch(console.log);
    }

    function generateAuthenticated() {
        IDENTITY_POOL_ID = $('#ipid').val();
        USER_POOL_ID = $('#upid').val();
        CLIENT_ID = $('#cid').val();
        USER = $('#user').val();
        PASSWORD = $('#password').val();
        NEW_PASSWORD = $('#new_password').val();

        AWS.config.region = 'ap-northeast-1';
        AWS.config.credentials = new AWS.CognitoIdentityCredentials({
            IdentityPoolId: IDENTITY_POOL_ID
        });

        let authenticationData = {
            Username: USER,
            Password: PASSWORD,
        };
        let authenticationDetails = new AWSCognito.CognitoIdentityServiceProvider.AuthenticationDetails(authenticationData);
        let poolData = {
            UserPoolId: USER_POOL_ID,
            ClientId: CLIENT_ID
        };
        let userPool = new AWSCognito.CognitoIdentityServiceProvider.CognitoUserPool(poolData);
        let userData = {
            Username: USER,
            Pool: userPool
        };
        let cognitoUser = new AWSCognito.CognitoIdentityServiceProvider.CognitoUser(userData);

        $('[id^=admin-btn]').attr('disabled', true);

        cognitoUser.authenticateUser(authenticationDetails, {
            onSuccess: function (result) {
                console.log('Success Login')
                // console.log('access token + ' + result.getAccessToken().getJwtToken());
                // console.log('idToken + ' + result.idToken.jwtToken);

                AWS.config.credentials = new AWS.CognitoIdentityCredentials({
                    IdentityPoolId: IDENTITY_POOL_ID,
                    IdentityId: AWS.config.credentials.identityId,
                    Logins: {
                        [`cognito-idp.ap-northeast-1.amazonaws.com/${USER_POOL_ID}`]: result.idToken.jwtToken
                    }
                });

                const sts = new AWS.STS({});
                sts.getCallerIdentity().promise()
                    .then(data => {
                        console.log('UserLoginService: Successfully set the AWS credentials');

                        $('#admin-btn-identity-id').attr('data-clipboard-text', AWS.config.credentials.params.IdentityId);
                        $('#admin-btn-access-key').attr('data-clipboard-text', AWS.config.credentials.accessKeyId);
                        $('#admin-btn-secret-key').attr('data-clipboard-text', AWS.config.credentials.secretAccessKey);
                        $('#admin-btn-session-token').attr('data-clipboard-text', AWS.config.credentials.sessionToken);
                        $('#admin-btn-access-token').attr('data-clipboard-text', result.getAccessToken().getJwtToken());
                        $('#admin-btn-id-token').attr('data-clipboard-text', result.getIdToken().getJwtToken());

                        $('[id^=admin-btn]').attr('disabled', false);

                        // updateUserAttributes(cognitoUser);

                    })
                    .catch(console.log);
            },

            onFailure: function (err) {
                console.log('Failed Login')
            },

            newPasswordRequired: function (userAttributes, requiredAttributes) {
                console.log('New Password Required');

                delete userAttributes.email_verified;

                cognitoUser.completeNewPasswordChallenge(NEW_PASSWORD, requiredAttributes, {
                    onSuccess: function (result) {
                        console.log('Success new password challenge');
                        $('#password').val(NEW_PASSWORD);
                        $('#new_password').val("");
                    },
                    onFailure: function (err) {
                        console.log('Failed new password challenge');
                    }
                });
            }

        });
    }

    function updateUserAttributes(cognitoUser) {
        let attributeList = [];
        let attribute = new AWSCognito.CognitoIdentityServiceProvider.CognitoUserAttribute({
            Name: 'custom:role',
            Value: 'operator'
        });
        attributeList.push(attribute);


        cognitoUser.updateAttributes(attributeList, function (err, result) {
            if (err) {
                alert(err);
                return;
            }
            console.log('call result: ' + result);
        });
    }

    $('.generate-auth').on('click', window, e => {
        e.preventDefault();

        generateAuthenticated();
    });

    $('.generate-unauth').on('click', window, e => {
        e.preventDefault();

        generateUnAuthenticated();
    });

    let clipboard = new ClipboardJS('.btn-cpy');

    clipboard.on('success', function (e) {
        console.log($(e.trigger))

        $('[id^=admin-btn]').tooltip('destroy');
        $('[id^=guest-btn]').tooltip('destroy');

        $(e.trigger).tooltip({
            container: 'body',
            title: 'Copied!',
            trigger: 'manual'
        }).tooltip('show');

        e.clearSelection();
    });

    clipboard.on('error', function (e) {
        console.error('Action:', e.action);
        console.error('Trigger:', e.trigger);
    });
})(jQuery);
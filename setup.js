const Vonage = require("@vonage/server-sdk");
var readline = require("readline");
const fs = require("fs");

var rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

rl.question("What is your Nexmo API Key? ", function (nexmoApiKey) {
  if (!nexmoApiKey) {
    console.log("Wrong nexmoApiKey.");
    rl.close();
  }
  rl.question("What is your Nexmo API Secret? ", function (nexmoApiSecret) {
    if (!nexmoApiSecret) {
      console.log("Wrong nexmoApiSecret.");
      rl.close();
    }
    rl.question("What is your Tokbox API Key? ", function (tokboxApiKey) {
      if (!tokboxApiKey) {
        console.log("Wrong tokboxApiKey.");
        rl.close();
      }
      rl.question(
        "What is your Tokbox API Secret? ",
        function (tokboxApiSecret) {
          if (!tokboxApiSecret) {
            console.log("Wrong tokboxApiSecret.");
            rl.close();
          }
          rl.question(
            "Which App Name would you like to use? ",
            function (applicationName) {
              if (!applicationName) {
                console.log("Wrong app name.");
                rl.close();
              }
              // TODO: check tokbox key

              const vonage = new Vonage({
                apiKey: nexmoApiKey,
                apiSecret: nexmoApiSecret,
              });

              if (!vonage) {
                console.log("Could not initalize vonage instance.");
                rl.close();
              }
              // create a new application and set urls to random... they will be updated automatically on each app start
              vonage.applications.create(
                {
                  name: applicationName,
                  capabilities: {
                    voice: {
                      webhooks: {
                        answer_url: {
                          address: "https://example.com/nexmo-answer",
                          http_method: "GET",
                        },
                        event_url: {
                          address: "https://example.com/nexmo-events",
                          http_method: "POST",
                        },
                      },
                    },
                  },
                },
                (error, result) => {
                  if (error) {
                    console.error("Error creating app: ", error);
                    rl.close();
                  } else {
                    console.log(
                      "App created: ",
                      result.name,
                      ", ID: ",
                      result.id
                    );
                    const appId = result.id;
                    const appName = result.name;
                    const privateKeyString = result.keys.private_key;
                    const privateKeyPath = `./private-${appId}.key`;

                    fs.writeFile(privateKeyPath, privateKeyString, (err) => {
                      if (err) {
                        console.error("Could not write keyfile: ", err);
                        rl.close();
                      }
                      //file written successfully
                      console.log(
                        "Private keyfile written to project directory."
                      );
                      vonage.number.get({}, (err, res) => {
                        if (err) {
                          console.error(err);
                          rl.close();
                        } else {
                          console.log(
                            `Here are ${res.numbers.length} usable numbers from your account:`
                          );
                          const allNumbers = res.numbers;
                          res.numbers.forEach((number) => {
                            console.log(
                              `Number: ${number.msisdn} Type: ${
                                number.type
                              } ${JSON.stringify(number)}`
                            );
                          });
                          // ask if link existing number or buy new one?
                          rl.question(
                            "What is the Nexmo phone number you would like to link to the newly created application as Dial-In number? ",
                            function (dialInNumber) {
                              if (!dialInNumber) {
                                console.log("Wrong dialInNumber.");
                                rl.close();
                              }
                              const linkableNumber = allNumbers.find(
                                (n) => n.msisdn == dialInNumber
                              );
                              vonage.number.update(
                                linkableNumber.country,
                                linkableNumber.msisdn,
                                {
                                  app_id: appId,
                                },
                                (err, res) => {
                                  if (err) {
                                    console.error(
                                      "Error linking number: ",
                                      err
                                    );
                                  } else {
                                    console.log("Linked number to app.");
                                    const configData = {
                                      apiKey: tokboxApiKey, // TokBox apiKey
                                      apiSecret: tokboxApiSecret, // TokBox apiSecret
                                      sip: {
                                        username: nexmoApiKey, // Nexmo apiKey
                                        password: nexmoApiSecret, // Nexmo apiSecret
                                        app_id: appId, // Nexmo app id
                                        app_name: appName, // the name you want your app to have
                                        private_key_path: privateKeyPath, // private key file from app id's dashboard https://dashboard.nexmo.com/applications/<appid>
                                      },
                                      conferenceNumber: linkableNumber.msisdn, // the Nexmo Virtual Number
                                      conferenceNumberCountryCode:
                                        linkableNumber.country,
                                    };
                                    fs.writeFile(
                                      `config-${appId}.js`,
                                      `module.exports = ${JSON.stringify(
                                        configData
                                      )};`,
                                      (err) => {
                                        if (err) {
                                          console.error(
                                            "Could not write config file: ",
                                            err
                                          );
                                          rl.close();
                                        }
                                        //file written successfully
                                        console.log(
                                          "Config file written to project directory."
                                        );
                                      }
                                    );
                                    rl.close();
                                  }
                                }
                              );
                            }
                          );
                        }
                      });
                    });
                  }
                }
              );
            }
          );
        }
      );
    });
  });
});

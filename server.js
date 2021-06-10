const express = require("express");
const OpenTok = require("opentok");
const config = require("./config");
const app = express();

app.use(express.static(`${__dirname}/public`));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
const OT = new OpenTok(config.apiKey, config.apiSecret);
const { serverUrl } = config;
const Vonage = require("@vonage/server-sdk");
const vonage = new Vonage({
  apiKey: config.sip.username,
  apiSecret: config.sip.password,
  applicationId: config.sip.app_id,
  privateKey: config.sip.private_key_path,
});

function dialOut(roomId = null) {
  return new Promise((resolve, reject) => {
    console.log("entered roomid: ", roomId);
    if (!roomId) {
      let message = "please provide a room id";
      console.error(message);
      reject({
        status: 500,
        type: "message",
        message,
      });
    }
    const { conferenceNumber } = config;
    const sipTokenData = `{"sip":true, "role":"client", "name":"'${conferenceNumber}'"}`;
    const sessionId = app.get(roomId);
    const token = generateToken(sessionId, sipTokenData);
    const options = setSipOptions();
    const sipUri = `sip:${conferenceNumber}@sip.nexmo.com;transport=tls`;
    OT.dial(sessionId, token, sipUri, options, (error, sipCall) => {
      if (error) {
        let message = "There was an error dialing out";
        console.error(message);
        reject({
          status: 500,
          type: "message",
          message,
        });
      } else {
        console.log("sip call created: ", sipCall);
        //app.set(conferenceNumber + roomId, sipCall.connectionId);
        app.set(`connectionid-${sessionId}`, sipCall.connectionId);
        resolve({ status: 200, type: "json", json: sipCall });
      }
    });
  });
}

/**
 * generateToken is used to create a token for a user
 * @param {String} sessionId
 * @param {String} sipTokenData
 */

const generateToken = (sessionId, sipTokenData = "") =>
  OT.generateToken(sessionId, {
    role: "moderator",
    data: sipTokenData,
  });

/**
 * generatePin is used to create a 4 digit pin
 */

const generatePin = () => {
  const pin = Math.floor(Math.random() * 9000) + 1000;
  if (app.get(pin)) {
    return generatePin();
  }
  return pin;
};

/**
   * renderRoom is used to render the ejs template
   * @param {Object} res
   * @param {String} sessionId
   * @param {String} token
   * @param {String} roomId
   * @param {Number} pinCode

*/

const renderRoom = (res, sessionId, token, roomId, pinCode) => {
  const { apiKey, conferenceNumber } = config;
  res.render("index.ejs", {
    apiKey,
    sessionId,
    token,
    roomId,
    pinCode,
    conferenceNumber,
  });
};

/**
 * setSipOptions is used to set properties for the OT.dial API call
 * @returns {Object}
 */

const setSipOptions = () => ({
  auth: {
    username: config.sip.username,
    password: config.sip.password,
  },
  secure: false,
});

/**
 * When the room/:roomId request is made, either a template is rendered is served with the
 * sessionid, token, pinCode, roomId, and apiKey.
 */

app.get("/room/:roomId", (req, res) => {
  const { roomId } = req.params;
  let pinCode;
  if (app.get(roomId)) {
    const sessionId = app.get(roomId);
    const token = generateToken(sessionId);
    console.log(token === "92cbf1ac-3cd6-4548-881b-60bc6f30b749");
    pinCode = app.get(sessionId);
    renderRoom(res, sessionId, token, roomId, pinCode);
  } else {
    pinCode = generatePin();
    OT.createSession(
      {
        mediaMode: "routed",
      },
      (error, session) => {
        if (error) {
          return res.send("There was an error").status(500);
        }
        const { sessionId } = session;
        const token = generateToken(sessionId);
        app.set(roomId, sessionId);
        app.set(`${sessionId}-room`, roomId);
        app.set(pinCode, sessionId);
        renderRoom(res, sessionId, token, roomId, pinCode);
      }
    );
  }
});

app.get("/nexmo-answer", (req, res) => {
  const ncco = [];
  if (req.query["SipHeader_X-OpenTok-SessionId"]) {
    // this is called when the incoming call from OT.dial() is received
    ncco.push({
      action: "conversation",
      name: req.query["SipHeader_X-OpenTok-SessionId"],
    });
  } else {
    // this is called, when an incoming call on the phone number is received
    ncco.push(
      {
        action: "talk",
        text: "Please enter a pin code to join the session",
      },
      {
        action: "input",
        eventUrl: [`${serverUrl}/nexmo-dtmf`],
      }
    );
  }
  res.json(ncco);
});

app.post("/nexmo-dtmf", async (req, res) => {
  const { dtmf, msisdn } = req.body;
  console.log(`received pin entry from caller ${msisdn}: ${dtmf}`);

  let token;
  let sessionId = app.get(dtmf);

  console.log("for this pin, the following session id is stored: ", sessionId);

  // if the pin is wrong, there is no stored session id
  if (sessionId) {
    token = generateToken(sessionId);
  }

  // if session id was found and token created
  if (sessionId && token) {
    // dial out from the video session if pin is correctly entered first time
    const dialedOut = app.get(`${sessionId}-dialout-status`);
    if (dialedOut && dialedOut == true) {
      // do not dial out after it has been done already, only connect
      const ncco = [
        {
          action: "conversation",
          name: sessionId,
          token: token,
        },
      ];
      res.json(ncco);
    } else {
      const roomId = app.get(`${sessionId}-room`);
      console.log("Room id for dialout: ", roomId);
      const result = await dialOut(roomId);
      console.log("dialout result: ", result);
      if (result.status == 200) {
        app.set(`${sessionId}-room`, roomId);
        app.set(`${sessionId}-dialout-status`, true);
        const ncco = [
          {
            action: "conversation",
            name: sessionId,
            token: token,
          },
        ];
        res.json(ncco);
      } else {
        // error fetching roomid from session id
        const ncco = [
          {
            action: "talk",
            text: "Please enter the correct pin.",
          },
          {
            action: "input",
            eventUrl: [`${serverUrl}/nexmo-dtmf`],
          },
        ];
        res.json(ncco);
      }
    }
  } else {
    const ncco = [
      {
        action: "talk",
        text: "Not session was found for this pin. Please enter the correct pin.",
      },
      {
        action: "input",
        eventUrl: [`${serverUrl}/nexmo-dtmf`],
      },
    ];
    res.json(ncco);
  }
});

// this endpoint receives call status events
app.all("/nexmo-events", (req, res) => {
  console.log("Call status update: ", req.body);

  // if inbound event is user ending a call
  // a) check if conversation contains more than tokbox user
  // b) if only video user left, end tokbox sip leg as well to save minutes
  // c) remove info from storage so a new sip leg can be created again
  if (req.body.status == "completed") {
    vonage.conversations.get(
      req.body.conversation_uuid,
      (error, resultConversation) => {
        if (error) {
          console.error(error);
        } else {
          console.log("Conversation info: ", resultConversation);
          let remainingMembers = resultConversation.members.filter(
            (mem) => mem.state === "JOINED"
          );
          console.log("remainingMembers: ", JSON.stringify(remainingMembers));
          if (
            remainingMembers.length == 1 &&
            remainingMembers[0]?.channel?.from?.type == "phone" &&
            remainingMembers[0]?.channel?.from?.number == "0000000000"
          ) {
            // disconnect TB and remove from storage
            const sessionId = resultConversation.name;
            const connectionId = app.get(`connectionid-${sessionId}`);
            if (sessionId && connectionId) {
              OT.forceDisconnect(sessionId, connectionId, (error) => {
                if (error) {
                  console.log("There was an error hanging up");
                } else {
                  //app.set(conferenceNumber + roomId, sipCall.connectionId);
                  app.set(`connectionid-${sessionId}`, null);
                  app.set(`${sessionId}-dialout-status`, null);
                  console.log("disconnect video sip call: Ok");
                }
              });
            } else {
              console.error("There was an error hanging up");
            }
          }
        }
      }
    );
  }

  res.status(200).send();
});

const port = process.env.PORT || "3000";
app.listen(port, () => console.log(`listening on port ${port}`));

const session = OT.initSession(apiKey, sessionId);
const publisher = OT.initPublisher("publisher", {
  insertMode: "append",
  width: "100%",
});

session.on({
  streamCreated: (event) => {
    const subscriberClassName = `subscriber-${event.stream.streamId}`;
    const subscriber = document.createElement("div");
    subscriber.setAttribute("id", subscriberClassName);
    document.getElementById("subscribers").appendChild(subscriber);
    session.subscribe(event.stream, subscriberClassName);
    addCallEvent({
      ...event,
      message: "An audio or video stream was created.",
    });
  },
  streamDestroyed: (event) => {
    console.log(`Stream ${event.stream.name} ended because ${event.reason}.`);
    addCallEvent({
      ...event,
      message: "An audio or video stream was removed.",
    });
  },
  sessionConnected: (event) => {
    console.log("session connected", event);
    session.publish(publisher);
    addCallEvent({
      ...event,
      message: "A user connected to the video session.",
    });
  },
  signal: (event) => {
    console.log("Signal event sent from connection: ", JSON.stringify(event));
    console.log("Signal data: ", JSON.stringify(event.data));

    switch (event.type) {
      case "signal:SipVideoConnectionCreated":
        addCallEvent({
          ...event,
          type: "SipVideoConnectionCreated",
          message: `A SIP Audio/Video connection was created for callee ${event.data.connectionData.callee}.`,
        });
        break;
      case "signal:SipVideoConnectionDestroyed":
        let cost = ((event.data.lengthSeconds / 60) * 0.005).toFixed(2);
        addCallEvent({
          ...event,
          type: "SipVideoConnectionDestroyed",
          message: `A SIP Audio/Video connection was removed. The call length was ${event.data.lengthSeconds} seconds with a cost of ${cost}$. The calle was ${event.data.data.callee}`,
        });
        document.getElementById(
          "videoSipLength"
        ).innerHTML = `${event.data.lengthSeconds}s`;
        document.getElementById("videoSipCost").innerHTML = `${cost}$`;
        break;
      case "signal:NexmoSipCallEnded":
        addCallEvent({
          ...event,
          type: "NexmoSipCallEnded",
          message: `Nexmo Sip Call ended with length of ${event.data.lengthSeconds} and cost of ${event.data.cost}€`,
        });
        break;
      case "signal:callDestroyed":
        addCallEvent({
          ...event,
          type: "callDestroyed",
          message: `The Nexmo SIP call length was ${event.data.callData.duration} seconds with a cost of ${event.data.callData.price}$.`,
        });
        document.getElementById(
          "nexmoSipLength"
        ).innerHTML = `${event.data.callData.duration}s`;
        document.getElementById(
          "nexmoSipCost"
        ).innerHTML = `${event.data.callData.price}$`;
        break;

      default:
        console.log("irrelevant signal: ", JSON.stringify(event.data));
        break;
    }
  },
});

session.connect(token, (error) => {
  if (error) {
    console.log("error connecting to session");
  }
});

function setSipVideoOutHtml(data) {
  let html = "";
  ["id", "projectId", "sessionId", "connectionId", "streamId"].forEach(
    (key) => {
      html += `${key}: ${data[key]}<br/>`;
    }
  );
  document.getElementById("sipVideoOut").innerHTML = html;
}

function addCallEvent(event) {
  if (event && event.type) {
    let card = document.createElement("div");
    card.classList.add("card");
    card.classList.add("mt-1");

    let cardBody = document.createElement("div");
    cardBody.classList.add("card-body");

    let cardFooter = document.createElement("div");
    cardFooter.classList.add("card-footer");

    let cardHeader = document.createElement("div");
    cardHeader.classList.add("card-header");

    let cardFooterSmall = document.createElement("small");
    cardFooterSmall.classList.add("text-muted");

    let timestampText = document.createTextNode(`${new Date().toUTCString()}`);
    let headerText = document.createTextNode(`${event.type}`);
    let messageText = document.createTextNode(`${event.message}`);

    cardFooterSmall.appendChild(timestampText);
    cardFooter.appendChild(cardFooterSmall);
    cardBody.appendChild(messageText);
    cardHeader.appendChild(headerText);

    if (event.data) {
      let collapseId = `collapse-${Date.now()}`;

      let collapseButton = document.createElement("button");
      collapseButton.classList.add("btn");
      collapseButton.classList.add("btn-primary");
      collapseButton.appendChild(document.createTextNode(`Show Data`));
      collapseButton.setAttribute("data-bs-toggle", "collapse");
      collapseButton.setAttribute("data-bs-target", `#${collapseId}`);
      collapseButton.setAttribute("aria-expanded", "false");
      collapseButton.setAttribute("aria-controls", `${collapseId}`);

      let collapse = document.createElement("div");
      collapse.classList.add("collapse");
      collapse.id = `${collapseId}`;

      let pre = document.createElement("pre");
      let code = document.createElement("code");

      let dataText = event.data
        ? document.createTextNode(`${JSON.stringify(event.data, null, 3)}`)
        : null;

      code.appendChild(dataText);
      pre.appendChild(code);
      collapse.appendChild(pre);

      cardBody.appendChild(document.createElement("br"));
      cardBody.appendChild(collapseButton);

      cardBody.appendChild(document.createElement("br"));
      cardBody.appendChild(collapse);
    }

    card.appendChild(cardHeader);
    card.appendChild(cardBody);
    card.appendChild(cardFooter);
    document.getElementById("callEvents").appendChild(card);
  }
}

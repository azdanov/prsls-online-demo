const XRay = require("aws-xray-sdk-core");
const SNS = require("aws-sdk/clients/sns");
const Log = require("@dazn/lambda-powertools-logger");
const wrap = require("@dazn/lambda-powertools-pattern-basic");

const eventBridge = XRay.captureAWSClient(
  require("@dazn/lambda-powertools-eventbridge-client")
);

const sns = XRay.captureAWSClient(new SNS());

const busName = process.env.bus_name;
const topicArn = process.env.restaurant_notification_topic;

module.exports.handler = wrap(async (event) => {
  const order = event.detail;
  const snsReq = {
    Message: JSON.stringify(order),
    TopicArn: topicArn,
  };
  await sns.publish(snsReq).promise();

  Log.debug("notified restaurant");

  await eventBridge
    .putEvents({
      Entries: [
        {
          Source: "big-mouth",
          DetailType: "restaurant_notified",
          Detail: JSON.stringify(order),
          EventBusName: busName,
        },
      ],
    })
    .promise();

  Log.debug(`published event into EventBridge`, {
    eventType: "restaurant_notified",
    busName,
  });
});

const ssm = require("@middy/ssm");
const DocumentClient = require("aws-sdk/clients/dynamodb").DocumentClient;
const dynamodb = new DocumentClient();
const XRay = require("aws-xray-sdk-core");
const Log = require("@dazn/lambda-powertools-logger");
const wrap = require("@dazn/lambda-powertools-pattern-basic");

XRay.captureAWSClient(dynamodb.service);

const { serviceName, stage, restaurants_table } = process.env;

const findRestaurantsByTheme = async (theme, count) => {
  Log.debug("finding restaurants...", {
    count,
    theme,
    tableName: restaurants_table,
  });

  const req = {
    TableName: restaurants_table,
    Limit: count,
    FilterExpression: "contains(themes, :theme)",
    ExpressionAttributeValues: { ":theme": theme },
  };

  const resp = await dynamodb.scan(req).promise();
  Log.debug("found restaurants", {
    count: resp.Items.length,
  });
  return resp.Items;
};

module.exports.handler = wrap(async (event, context) => {
  const req = JSON.parse(event.body);
  const theme = req.theme;
  const restaurants = await findRestaurantsByTheme(
    theme,
    context.config.defaultResults
  );

  return {
    statusCode: 200,
    body: JSON.stringify(restaurants),
  };
}).use(
  ssm({
    cache: true,
    cacheExpiry: 1 * 60 * 1000, // 1 mins
    setToContext: true,
    fetchData: {
      config: `/${serviceName}/${stage}/search-restaurants/config`,
    },
  })
);

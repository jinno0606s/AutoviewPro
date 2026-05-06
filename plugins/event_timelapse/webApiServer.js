// webApiServer.js

if(req.url === "/api/plugin/run"){

  const events = await run(ctx)

  res.end(JSON.stringify(events))

}

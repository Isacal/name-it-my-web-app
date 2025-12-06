const http = require("http");

const hostname = "127.0.0.1"; // localhost
const port = 3000;

const server = http.createServer((req, res) => {
  res.statusCode = 200;
  res.setHeader("Content-Type", "text/plain");
  res.end("Hello, Node.js Web Server!\n");
  res.end("Hello Again this is, Node.js Web Server!\n");
  res.end(
    "Hello Again this is, Node.js Web Server! after making small changes to shaow branches\n"
  );
});

//create an arry of names and print each name with a greeting
const names = ["Alice", "Bob", "Charlie"];
names.forEach((name) => {
  console.log(`Hello, ${name}!`);
});

server.listen(port, hostname, () => {
  console.log(`Server running at http://${hostname}:${port}/`);
});

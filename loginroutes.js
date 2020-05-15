var mysql      = require('mysql');
var connection = mysql.createConnection({
  host     : 'localhost',
  user     : 'wustl_inst',
  password : 'wustl_pass',
  database : 'module6'
});
connection.connect(function(err){
if(!err) {
    console.log("Database is connected ... nn");
} else {
    console.log("Error connecting database ... nn");
}
});
//register
exports.register = function(req,res){
   var users={
 
     "username":req.body.username
   }
  connection.query('INSERT INTO users SET ?',users, function (error, results, fields) {
  if (error) {
    console.log("error ocurred",error);
    res.send({
      "code":400,
      "failed":"error ocurred"
    })
  }else{
    console.log('The solution is: ', results);
    res.send({
      "code":200,
      "success":"user registered sucessfully"
        });
  }
  });
}
//login
exports.login = function(req,res){
  var username= req.body.username;
  connection.query('SELECT * FROM users WHERE username = ?',[username], function (error, results, fields) {
  if (error) {
    // console.log("error ocurred",error);
    res.send({
      "code":400,
      "failed":"error ocurred"
    })
  }else{
    // console.log('The solution is: ', results);
    if(results.length >0){
      res.send({
          "code":200,
          "success":"login sucessfull"
	  });
    
  } else{
      res.send({
        "code":204,
        "success":"username does not exits"
          });
    }
  }
});

}
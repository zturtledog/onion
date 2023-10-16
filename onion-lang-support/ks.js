function setup() {
    createCanvas(400, 400);
  }
  
  function draw() {
    background(220,0,0,0);
    
    let theme = {
      b:"#250830",
      f:"#EFEFFF",
      bl:220
    }
    noStroke()
    // fill(theme.bl)
    // rect(width/2-200,height/2-200,400,400,17)
    fill(theme.b)
    rect(width/2-200,height/2-200,400,400,87)
    //o
    fill(theme.f)
    ellipse(400-75-25,400-75-25,150)
    fill(theme.b)
    ellipse(400-75-25,400-75-25,100)
  }
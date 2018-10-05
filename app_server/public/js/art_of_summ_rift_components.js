
/**
 * dependencies:  React, React-DOM, Bootstrap, jQuery;
 *                the dependencies are assumed to be predefined
*/
;
$(document).ready(() => {
  
/*  Components  */
/****************/
  class ArtOfSummRift extends React.Component {
    constructor(props) {
      super(props);
    }
    
    render() {
      
      return(
        <div className="container-fluid">
          <Title />
          <Album 
            classes="body"
          />
        </div>
      )
    }
  }
  
  class Title extends React.Component {
    constructor(props) {
      super(props)
    }
    
    render() {
      return (
        <div className="row">
          <div className="col">
            <h1>Art of Summoners Rift</h1>
          </div>
        </div>
      )
    }
  }
  
  class Album extends React.Component {
    constructor(props) {
      super(props);
    }
    
    
    render() {
      let classes = "row red " + this.props.classes;
      
      return (
        <div className={classes}>
          <div className="col-sm-5 offset-sm-1 yellow">
            <div>
              <p>Aefel alekfja e eofie f. eifajefkae fiaejfioae feaif. Aefel alekfja e eofie f. eifajefkae fiaejfioae feaif. Aefel alekfja e eofie f. eifajefkae fiaejfioae feaif.</p>
            </div>
          </div>
          <div className="col-sm-5 green">
            <img className="img-fluid" src='/images/minimap.png' />
          </div>
        </div>  
      )
    }
  }

  
/*  Attach module to window object  */
/************************************/
  const module_name = "Art_Of_Summ_Rift_Components";
  const riot_lol_app_components = {
    App: ArtOfSummRift
  }
  window[module_name] = riot_lol_app_components;
})
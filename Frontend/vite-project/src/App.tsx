import Alert from "./components/Alert";
import Clickme from "./components/clickme";

function App() {
  return (
    <div>
      <Alert>
        Hello <span>Vikas</span>
      </Alert>
      <Clickme onClick={() => console.log("clicked")}>click</Clickme>
    </div>
  );
}

export default App;

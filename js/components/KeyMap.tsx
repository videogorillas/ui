import * as React from "react";

const KeyMap = ({keymap}) => {
    return (<section>
        <h2>Hot keys</h2>
        <div>
            {Object.entries(keymap).map((k) => {
                return (
                    <div key={k[0]} className={"keymap"}>
                        <kbd>{k[0]}</kbd> <span>: {k[1]}</span>
                    </div>);
            })}
        </div>
    </section>);
};

export default KeyMap;

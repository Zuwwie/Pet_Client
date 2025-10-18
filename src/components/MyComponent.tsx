import type {FC} from "react";

type MyComponentPropType = { text: string }

const MyComponent: FC<MyComponentPropType> = ({text}) => {
    return <div>{text}</div>
}

export default MyComponent

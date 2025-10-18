// import {useQuery} from "@tanstack/react-query";
// import {getAllCandy} from '../services/candy.service.ts';
// import type {ICandy} from "../../models/ICandy.ts";
// import OneCandyPage from "./candys/OneCandyPage";
// import "./candy.css";
//
// export default function CandyPage() {
//     const {data, isLoading, isError, error} = useQuery({
//         queryKey: ["candy:list"],
//         queryFn: getAllCandy,
//     });
//
//     if (isLoading) return <div className="grid"><CardSkeleton count={8}/></div>;
//     if (isError) return <p className="error">Помилка: {(error as Error).message}</p>;
//     if (!data?.length) return <p className="muted">Наразі немає товарів.</p>;
//
//     return (
//         <div className="grid">
//             {data.map((c: ICandy) => (
//                 <OneCandyPage key={c._id} candy={c}/>
//             ))}
//         </div>
//     );
// }
//
// function CardSkeleton({count = 6}: { count?: number }) {
//     return (
//         <>
//             {Array.from({length: count}).map((_, i) => (
//                 <div className="cart sk" key={i}>
//                     <div className="thumb skb"/>
//                     <div className="info">
//                         <div className="skb line w60"/>
//                         <div className="skb line w40"/>
//                         <div className="skb btn"/>
//                     </div>
//                 </div>
//             ))}
//         </>
//     );
// }

import {useParams} from "react-router-dom";
import {usePageById} from "../hooks/usePages.ts";
import {useBlocks} from "../hooks/useBlocks.ts";


const PagesDetails = () => {
    const {id} = useParams<{id: string}>() || undefined;

    console.log(id)

        const {data:page, error, isLoading} = usePageById(id) || undefined;
        console.log(page)
        const {data:blocks} = useBlocks(id);
    console.log(blocks)


    return (
        <div>
            {isLoading && <p>Loading...</p>}
            {error && <p>Error: {error.message}</p>}
            {page && <div>
                <h1>{page.title}</h1>
                <p>{page.content}</p>

                {blocks && blocks.map((block, index) => (
                    <div key={index}>
                        <h2>{block?.title}</h2>
                        <p>{block.content}</p>
                    </div>))
                }
            </div>}
        </div>
    )
}

export default PagesDetails;
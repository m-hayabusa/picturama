import React from 'react'
import classnames from 'classnames'
import Electron from 'electron'


// import WorldMap, { worldMapAspect, maxLat } from 'app/ui/widget/icon/WorldMap'

import './OGCard.less'


// const earthRadius = 6378137  // In meter
// const rad2deg = 170 / Math.PI

// const topLat = 72
// const topWebmercY = lat2Webmerc(topLat)
// const maxWebmercY = lat2Webmerc(maxLat)


export interface Props {
    className?: any
    width: number
    url: string
}

export interface State {
    requested: boolean,
    og_title: string,
    og_image: string,
    og_description: string
}

export default class OGCard extends React.Component<Props, State> {
    constructor(props) {
        super(props);
        this.state = {
            requested: false,
            og_title: "",
            og_image: "",
            og_description: ""
        }
    }

    render() {
        const { props } = this
        const { width, url } = props
        if (!this.state.requested) {
            this.setState({
                requested: true
            });
            const xhr = new XMLHttpRequest();
            xhr.onload = () => {
                this.setState({
                    og_title: (xhr.responseXML?.getElementsByName("og:title")[0] as HTMLMetaElement).content,
                    og_image: (xhr.responseXML?.getElementsByName("og:image")[0] as HTMLMetaElement).content,
                    og_description: (xhr.responseXML?.getElementsByName("og:description")[0] as HTMLMetaElement).content
                });
            };
            xhr.responseType = "document";
            xhr.open("GET", url);
            xhr.send();
        } else {
            console.log(this.state.og_title);
        }

        return (
            <div
                className={classnames(props.className, 'OGCard')}
                style={{ width }}
            >
                <button
                    className='OGCard-clipper bp3-button'
                    style={{ width }}
                    onClick={()=>{Electron.shell.openExternal(url)}}
                >
                    <img className="OGCard-image" width={width-20} src={this.state.og_image}></img>

                    <h4 className="OGCard-title">{this.state.og_title}</h4>
                    <p>{this.state.og_description}</p>
                </button>
            </div>
        )
    }
}

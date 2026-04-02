import type { EventTS } from "../../shared/universals";
import { ns } from "../../shared/shared";

export const dispatchTS = <Key extends string & keyof EventTS>(
  event: Key,
  data: EventTS[Key]
) => {
  if (new ExternalObject("lib:PlugPlugExternalObject")) {
    var eventObj = new CSXSEvent();
    eventObj.type = `${ns}.${event}`;
    eventObj.data = JSON.stringify(data);
    eventObj.dispatch();
  }
};

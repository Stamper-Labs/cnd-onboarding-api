import { IsEnum } from 'class-validator';
import { Channel } from 'src/domain/entity/channel.enum';

export class ChannelDto {
  @IsEnum(Channel)
  channel: Channel;
}
